-- iqcommune V7 — consolidated schema (migrations 0001-0017)
--
-- Generated from supabase/migrations/*.sql. Same end state as replaying them in
-- order, with one deliberate difference: every enum is CREATEd with its final
-- value set, and the ALTER TYPE ... ADD VALUE statements that used to add those
-- values later are commented out.
--
-- That change is what makes this safe to paste into the Supabase SQL editor,
-- which runs a pasted script as a single transaction. Postgres refuses to let a
-- value added by ALTER TYPE ... ADD VALUE be USED in the transaction that added
-- it, and 0008 does exactly that ("update ... set status = 'Applied'"). Replayed
-- one file at a time it is fine; pasted as one script it fails halfway.
--
-- FOR A FRESH, EMPTY PROJECT ONLY. Every CREATE here is "if not exists", so on a
-- database that already has a table of the same name this silently skips it and
-- leaves the old shape in place — it reports success and changes nothing.
--
-- After this runs you still need: an admin account (scripts/create-admin.mjs),
-- the app's environment variables pointed at this project, and any data brought
-- across from the previous system.

begin;

-- ══════════════════════════════════════════════════════════════════════════
-- 0001_v7_core.sql
-- ══════════════════════════════════════════════════════════════════════════

-- V7 core schema — F3.
--
-- Carries forward the shape proven in production, minus every payment and tax
-- column (ADR 0001): no UPI, bank, IFSC, PAN, GST, TDS, net payout, invoice
-- name or family payee. Finance administers all of that offline now.
--
-- Scope is P1 only: what the landing page writes and reads. Practitioner,
-- session, agreement and admin tables arrive with the pages that need them,
-- not before.
--
-- Additive by construction. Nothing here drops or renames.

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without every caller remembering to set it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── SESSION REQUESTS ────────────────────────────────────────────────────────
-- Written by the public "Request a Session" modal.

do $$ begin
  create type session_request_status as enum ('New', 'Contacted', 'Scheduled', 'Closed', 'Cancelled', 'Matched');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type audience_type as enum ('individual', 'corporate', 'finance');
exception when duplicate_object then null;
end $$;

create table if not exists session_requests (
  id                uuid primary key default gen_random_uuid(),
  status            session_request_status not null default 'New',

  audience          audience_type not null,
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  phone             text not null,
  city              text not null,
  state             text not null,

  organisation_name text,
  topic             text not null,
  group_size        text,
  preferred_window  text,
  venue_details     text,
  notes             text,

  -- The SPOC declaration is a commitment the submitter makes; store that it was
  -- given, not merely that a box was ticked in a browser.
  spoc_confirmed    boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create or replace trigger session_requests_updated_at
  before update on session_requests
  for each row execute function set_updated_at();

-- Reads are "newest open requests first", so the index matches the query.
create index if not exists session_requests_triage_idx
  on session_requests (status, created_at desc)
  where deleted_at is null;
create index if not exists session_requests_email_idx on session_requests (lower(email));

-- ── GALLERY ─────────────────────────────────────────────────────────────────
-- Read by the public landing page; published from the admin console (P8).

create table if not exists gallery_photos (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text not null,
  city         text not null,
  sort_order   integer not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create or replace trigger gallery_photos_updated_at
  before update on gallery_photos
  for each row execute function set_updated_at();

create index if not exists gallery_photos_public_idx
  on gallery_photos (sort_order, created_at desc)
  where published and deleted_at is null;

-- ── PHOTO SUBMISSIONS ───────────────────────────────────────────────────────
-- Written by the public post-session photo modal.

do $$ begin
  create type photo_submission_status as enum ('Pending', 'Approved', 'Rejected', 'Expired');
exception when duplicate_object then null;
end $$;

create table if not exists photo_submissions (
  id                  uuid primary key default gen_random_uuid(),
  status              photo_submission_status not null default 'Pending',

  submitter_name      text not null,
  submitter_email     text not null,
  organisation_name   text,
  session_date        date not null,
  module_taught       text not null,

  storage_keys        text[] not null default '{}',

  -- Consent is a legal record: keep what was agreed and when, not just a flag.
  participant_consent boolean not null,
  consented_at        timestamptz not null default now(),

  -- Retention is data policy, so it lives in the row rather than in a cron's
  -- head. Nothing in V7 deletes on it until a restore has been proven from a
  -- real backup — BUILD-PLAN H4, ADR 0003.
  expiry_date         date not null default (current_date + interval '30 days'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create or replace trigger photo_submissions_updated_at
  before update on photo_submissions
  for each row execute function set_updated_at();

create index if not exists photo_submissions_review_idx
  on photo_submissions (status, created_at desc)
  where deleted_at is null;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Every table is deny-by-default. Server routes use the service-role key and
-- bypass RLS, so the route's own check is the real boundary — RLS here exists
-- to make the anon key useless for anything not explicitly granted below.

alter table session_requests  enable row level security;
alter table gallery_photos    enable row level security;
alter table photo_submissions enable row level security;

-- The public site reads published gallery photos and nothing else.
drop policy if exists gallery_photos_public_read on gallery_photos;
create policy gallery_photos_public_read on gallery_photos
  for select
  to anon, authenticated
  using (published and deleted_at is null);

-- No anon insert policy on session_requests or photo_submissions: both are
-- written through a server route that validates, rate-limits and logs first.
-- Granting anon insert here would route around all three.

-- ══════════════════════════════════════════════════════════════════════════
-- 0002_practitioners_sessions_agreements.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Practitioners, sessions, agreements, invites — F3, for P2 through P7.
--
-- Additive: nothing here drops or renames, and `set_updated_at()` from 0001 is
-- reused rather than redefined.
--
-- No payment or tax columns anywhere (ADR 0001): no UPI, bank, IFSC, PAN, GST,
-- TDS or net payout. The one money column is `gross_payout`, which the consent
-- page shows and says explicitly is pre-tax — finance administers the rest
-- offline.

-- ── PRACTITIONER APPLICATIONS ───────────────────────────────────────────────
-- Written by the public "Apply to Join the Network" modal (P2).

do $$ begin
  create type practitioner_application_status as enum ('New', 'Screening', 'Empanelled', 'Declined', 'Withdrawn', 'Applied', 'Screening Done', 'Agreement Sent', 'Rejected');
exception when duplicate_object then null;
end $$;

create table if not exists practitioner_applications (
  id                    uuid primary key default gen_random_uuid(),
  status                practitioner_application_status not null default 'New',

  first_name            text not null,
  last_name             text not null,
  -- The form asks for a personal address and promises confidentiality.
  email                 text not null,
  phone                 text not null,
  job_title             text not null,
  city                  text not null,
  state                 text not null,

  -- A band, not a number. The form offers ranges, and storing "9 - 12 years"
  -- as an integer would invent precision the applicant never gave.
  experience_band       text not null,

  -- Postal address for the welcome kit — the only reason it is collected.
  address               text not null,
  tshirt_size           text not null,

  -- Multi-select, so an array. No default: an application with no module is
  -- not a valid application, and '{}' would let one through.
  modules               text[] not null,
  teaching_frequency    text not null,
  motivation            text not null,

  -- Three separate acknowledgements, stored separately. Collapsing them would
  -- lose which commitment was given, and they cover different ones: what gets
  -- disclosed, no cross-selling, and whose job it is to tell an employer.
  consent_disclosure    boolean not null,
  consent_no_cross_sell boolean not null,
  consent_employer      boolean not null,
  consented_at          timestamptz not null default now(),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create or replace trigger practitioner_applications_updated_at
  before update on practitioner_applications
  for each row execute function set_updated_at();

create index if not exists practitioner_applications_triage_idx
  on practitioner_applications (status, created_at desc)
  where deleted_at is null;

-- Applying twice is a duplicate to spot, not an error to reject, so this is an
-- index rather than a unique constraint.
create index if not exists practitioner_applications_email_idx
  on practitioner_applications (lower(email));

-- ── PRACTITIONERS ───────────────────────────────────────────────────────────

do $$ begin
  create type practitioner_status as enum ('Empanelled', 'Paused', 'Deactivated', 'Pending');
exception when duplicate_object then null;
end $$;

create table if not exists practitioners (
  id           uuid primary key default gen_random_uuid(),
  status       practitioner_status not null default 'Empanelled',
  -- Human-readable reference shown on the photo page (IQC-EMP-0042). Unique so
  -- it can be quoted in an email and resolve to exactly one person.
  reference    text not null unique,
  full_name    text not null,
  role         text not null,
  organisation text,
  city         text not null,
  -- Nullable where city is not: state arrived after the earliest applications,
  -- and the agreement header would rather print a blank than a guess (0017).
  state        text,
  email        text not null,
  application_id uuid references practitioner_applications (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create or replace trigger practitioners_updated_at
  before update on practitioners
  for each row execute function set_updated_at();

create index if not exists practitioners_email_idx on practitioners (lower(email));

-- ── AGREEMENTS ──────────────────────────────────────────────────────────────
-- One practitioner may hold several over time (renewal, revised terms), which
-- is why the /onboarding token names an agreement and not a practitioner: an
-- agreement resolves to exactly one practitioner, the reverse does not hold.

create table if not exists practitioner_agreements (
  id                 uuid primary key default gen_random_uuid(),
  practitioner_id    uuid not null references practitioners (id),
  reference          text not null unique,
  issued_on          date not null default current_date,
  modules            text[] not null default '{}',
  version            text not null default 'v7',

  signed_at          timestamptz,
  signed_name        text,
  signed_designation text,
  -- Data URL for a drawn signature, or the typed name. The legally meaningful
  -- parts — when, from where, against which version — are the columns around
  -- it, captured server-side where they cannot be edited.
  signature_data     text,
  signature_mode     text,
  signed_ip          text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create or replace trigger practitioner_agreements_updated_at
  before update on practitioner_agreements
  for each row execute function set_updated_at();

create index if not exists practitioner_agreements_practitioner_idx
  on practitioner_agreements (practitioner_id, issued_on desc)
  where deleted_at is null;

-- ── SESSIONS ────────────────────────────────────────────────────────────────

do $$ begin
  create type session_status as enum ('Scheduled', 'Delivered', 'Cancelled', 'Pending', 'Confirmed', 'Completed');
exception when duplicate_object then null;
end $$;

create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  status             session_status not null default 'Scheduled',
  reference          text not null unique,
  -- Nullable: an admin-created session has no originating public request.
  session_request_id uuid references session_requests (id),

  module             text not null,
  session_date       date not null,
  start_time         time,
  duration_minutes   integer,
  venue              text,
  city               text not null,
  state              text not null,
  audience           audience_type not null,
  participants       text,

  -- Denormalised rather than joined through session_request_id, which may be
  -- null. The rating page's "Requested by" and the consent page's "SPOC name"
  -- are this same person, and both must resolve for every session.
  spoc_name          text not null,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create or replace trigger sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

create index if not exists sessions_schedule_idx
  on sessions (session_date desc, status)
  where deleted_at is null;

-- ── SESSION ASSIGNMENTS ─────────────────────────────────────────────────────
-- The row /rate, /consent and /submit-photos actually name — see the
-- correction in ADR 0004. Payout and consent are per practitioner per session,
-- so neither can live on `sessions`, and a session with two practitioners makes
-- a session id ambiguous for all three pages.

create table if not exists session_practitioners (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references sessions (id),
  practitioner_id     uuid not null references practitioners (id),
  -- Which agreement was in force. Without it, "which terms did this session run
  -- under" has no deterministic answer once a practitioner has renewed.
  agreement_id        uuid references practitioner_agreements (id),

  gross_payout        numeric(12, 2) not null,
  currency            text not null default 'INR',

  confirmation_reference text not null unique,
  confirmation_issued_on date not null default current_date,
  consent_given_at    timestamptz,
  consent_ip          text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  unique (session_id, practitioner_id)
);

create or replace trigger session_practitioners_updated_at
  before update on session_practitioners
  for each row execute function set_updated_at();

create index if not exists session_practitioners_practitioner_idx
  on session_practitioners (practitioner_id)
  where deleted_at is null;

-- ── RATINGS ─────────────────────────────────────────────────────────────────
-- Its own row rather than columns on the assignment: a rating is a submission
-- with its own timestamp and its own audit trail.

create table if not exists session_ratings (
  id                      uuid primary key default gen_random_uuid(),
  session_practitioner_id uuid not null unique references session_practitioners (id),
  rating                  smallint not null check (rating between 1 and 5),
  comments                text,
  submitted_at            timestamptz not null default now(),
  submitted_ip            text
);

-- ── ADMIN INVITES ───────────────────────────────────────────────────────────

do $$ begin
  create type admin_role as enum ('global_admin', 'admin', 'user');
exception when duplicate_object then null;
end $$;

create table if not exists admin_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        admin_role not null default 'admin',
  invited_by  text,
  expires_at  timestamptz not null,
  -- Single-use lives here, not in the token. ADR 0004 accepted that a token
  -- cannot be revoked before expiry; for an invite that would allow an account
  -- to be activated twice, so the loader must treat a consumed invite as an
  -- invalid link.
  consumed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create or replace trigger admin_invites_updated_at
  before update on admin_invites
  for each row execute function set_updated_at();

create index if not exists admin_invites_open_idx
  on admin_invites (email)
  where consumed_at is null and deleted_at is null;

-- ── PHOTO SUBMISSIONS — link the tokenised path to its session ──────────────
-- Both nullable: the public landing-page modal keeps working with only a name
-- and email, while the tokenised page fills the references instead.

alter table photo_submissions
  add column if not exists session_id      uuid references sessions (id),
  add column if not exists practitioner_id uuid references practitioners (id);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Deny-by-default on every new table, as in 0001. No anon policies at all:
-- everything here is written or read through a server route that verifies a
-- token or a session first, and an anon policy would route around that.

alter table practitioner_applications enable row level security;
alter table practitioners             enable row level security;
alter table practitioner_agreements   enable row level security;
alter table sessions                  enable row level security;
alter table session_practitioners     enable row level security;
alter table session_ratings           enable row level security;
alter table admin_invites             enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
-- 0003_session_photos_bucket.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Private storage for session photos — F3.
--
-- Created as a migration rather than by hand in the dashboard so a fresh
-- environment gets it too: the previous system provisioned buckets with ad-hoc
-- scripts, and a bucket that exists only where someone remembered to run one is
-- how an upload works in dev and 500s in production.
--
-- Private, and constrained at the bucket as well as in the route. The route's
-- check is the one that produces a good error message; this one is the check
-- that still holds if a future caller forgets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-photos', 'session-photos', false, 26214400, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies: every read and write goes through a server route holding
-- the service-role key, which bypasses them. Adding an anon policy here would
-- route around the token check that decides whose session a photo belongs to.

-- ══════════════════════════════════════════════════════════════════════════
-- 0004_gallery_bucket.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Gallery storage bucket (audit H1).
--
-- services/gallery.ts serves published marketing photos via getPublicUrl, which
-- only works on a PUBLIC bucket. 0003 provisioned session-photos but never the
-- gallery bucket, so a fresh environment 500s on the first gallery read and the
-- public URLs 404 — the exact "works where someone ran a script, breaks in prod"
-- failure 0003 exists to prevent.
--
-- Public by necessity. Only PUBLISHED objects may ever be written here (audit
-- M4): the row-level `published` flag has no storage-level teeth, so an
-- unpublished draft placed in a public bucket is world-readable by path. The
-- (not-yet-built) admin gallery upload panel must uphold that; if drafts ever
-- need staging, switch this to a private bucket + short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- L4: 0003's ON CONFLICT omitted the `public` flag, so a re-run could not undo a
-- dashboard flip of session-photos to public. Re-assert it here — session photos
-- are private and served only through signed URLs.
update storage.buckets set public = false where id = 'session-photos';

-- ══════════════════════════════════════════════════════════════════════════
-- 0005_integrity_constraints.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Integrity hardening (audit M4, M5, L1, L2).
--
-- Additive and idempotent: indexes use IF NOT EXISTS, each constraint is guarded
-- against re-run (Postgres has no ADD CONSTRAINT IF NOT EXISTS). Tables are
-- empty in a fresh V7 environment, so the CHECKs validate no existing rows.

-- ── L1: pin search_path on the shared trigger function ──────────────────────
-- Supabase's linter flags function_search_path_mutable. now() resolves from
-- pg_catalog regardless, so an empty search_path is safe and closes the
-- search_path-hijack vector.
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── M5: cover the foreign keys that today seq-scan on join / parent delete ──
create index if not exists practitioners_application_idx
  on practitioners (application_id) where deleted_at is null;
create index if not exists sessions_request_idx
  on sessions (session_request_id) where deleted_at is null;
create index if not exists session_practitioners_agreement_idx
  on session_practitioners (agreement_id) where deleted_at is null;
create index if not exists photo_submissions_session_idx
  on photo_submissions (session_id) where deleted_at is null;
create index if not exists photo_submissions_practitioner_idx
  on photo_submissions (practitioner_id) where deleted_at is null;

-- ── M4 + L2: mirror the closed Zod domains + money floor at the DB layer ────
-- A non-route writer (console, backfill, manual SQL) can otherwise persist a
-- value the app cannot render or filter. Values copied verbatim from
-- lib/schemas/application.ts — the en-dash and em-dash below are U+2013 / U+2014,
-- matching the TS constants the app inserts.
do $$ begin
  alter table practitioner_applications
    add constraint tshirt_size_domain
    check (tshirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table practitioner_applications
    add constraint experience_band_domain
    check (experience_band in ('5 – 8 years', '9 – 12 years', '13 – 18 years', '18+ years'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table practitioner_applications
    add constraint teaching_frequency_domain
    check (teaching_frequency in (
      'Once a month', 'Once in 2 months', 'Once a quarter',
      'Flexible — depends on my schedule'
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table practitioner_applications
    add constraint modules_domain
    check (modules <@ array[
      'Foundations of Personal Finance',
      'Retirement & Goal-Based Financial Planning',
      'Equity Investing Simplified',
      'Debt & Fixed Income Investing',
      'Asset Allocation & Portfolio Construction',
      'Investment Solutions & Portfolio Strategies'
    ]::text[]);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table session_practitioners
    add constraint currency_iso check (char_length(currency) = 3);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table session_practitioners
    add constraint gross_payout_nonneg check (gross_payout >= 0);
exception when duplicate_object then null; end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 0006_activity_log.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Activity log (audit M9).
--
-- The operating procedure mandates an audit trail with 90-day retention. The
-- capability already ships (the console has an Activity tab, global-admin only),
-- but there was no table behind it. Additive and idempotent.
--
-- Retention is NOT enforced by a cron here: V6's purge crons are deliberately
-- absent until a restore is proven from backup (ENVIRONMENT.md, ADR-0003). The
-- 90-day prune is reintroduced with those, not before.

create table if not exists activity_log (
  id           uuid primary key default gen_random_uuid(),
  -- Who acted. Email rather than a user FK: the actor may be a system process
  -- (an automatic status transition) with no console account.
  actor_email  text,
  -- What happened, e.g. "practitioner.empanelled", "session.matched".
  action       text not null,
  -- The record it concerns, for filtering — type + human reference, not a FK,
  -- so the log survives the row it describes being hard-deleted.
  entity_type  text,
  entity_ref   text,
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_recent_idx on activity_log (created_at desc);
create index if not exists activity_log_entity_idx on activity_log (entity_type, entity_ref);

-- Deny-by-default like every other table: read only through the service-role
-- client behind the global-admin console route.
alter table activity_log enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
-- 0007_v7_status_values.sql
-- ══════════════════════════════════════════════════════════════════════════

-- V7 status vocabulary (audit H2) — EXPAND phase only.
--
-- The status enums predate the CA-redesign workflow. This adds the values the
-- V7 operating procedure's automatic transitions need. It is expand-only and
-- safe: `ADD VALUE IF NOT EXISTS` is additive, touches no existing row, and
-- removes nothing. The BACKFILL of live rows onto the new vocabulary (e.g.
-- retiring 'Scheduled' in favour of 'Confirmed') is a separate migration and a
-- CLIENT DECISION before cutover — it is deliberately NOT done here.
--
-- Note: a value added by ALTER TYPE ... ADD VALUE cannot be used in the same
-- transaction that adds it. These run before any code references them, so that
-- restriction does not apply at runtime.

-- Session requests: New → Matched → (Scheduled) → Cancelled. 'Matched' is the
-- trigger step 8 keys the automatic session-record creation on.
-- [consolidated] folded into the CREATE TYPE above: alter type session_request_status add value if not exists 'Matched';

-- Practitioner applications: Applied → Screening Done → Agreement Sent →
-- Empanelled / Rejected.
-- [consolidated] folded into the CREATE TYPE above: alter type practitioner_application_status add value if not exists 'Applied';
-- [consolidated] folded into the CREATE TYPE above: alter type practitioner_application_status add value if not exists 'Screening Done';
-- [consolidated] folded into the CREATE TYPE above: alter type practitioner_application_status add value if not exists 'Agreement Sent';
-- [consolidated] folded into the CREATE TYPE above: alter type practitioner_application_status add value if not exists 'Rejected';

-- Sessions: Pending → Confirmed → Completed (with Cancelled throughout). Step 13
-- filters on 'Confirmed'; step 15→17 gates the rating link on 'Completed'.
-- [consolidated] folded into the CREATE TYPE above: alter type session_status add value if not exists 'Pending';
-- [consolidated] folded into the CREATE TYPE above: alter type session_status add value if not exists 'Confirmed';
-- [consolidated] folded into the CREATE TYPE above: alter type session_status add value if not exists 'Completed';

-- ══════════════════════════════════════════════════════════════════════════
-- 0008_v7_practitioner_pipeline.sql
-- ══════════════════════════════════════════════════════════════════════════

-- V7 practitioner pipeline — make the console's first tab possible.
--
-- The V7 console shows ONE pipeline: Applied → Screening Done → Agreement Sent →
-- Empanelled / Rejected (with Deactivated as a later, reversible state). Those
-- stages span two tables here: the first four belong to `practitioner_applications`
-- (which holds the rich profile the detail card renders), the last two to
-- `practitioners`. The console reads the union; this migration makes both sides
-- speak the V7 vocabulary.
--
-- Expand-only and idempotent. Nothing is dropped: the pre-V7 values stay in the
-- enum so an unmigrated row can never fail to render.

-- ── 1. A practitioner may exist before they are empanelled ──────────────────
-- "Generate & send agreement" creates the practitioner + agreement rows so the
-- agreement has an FK to point at, but the person is not empanelled until the
-- signed copy comes back. Without this value that intermediate has to borrow
-- 'Paused', which means something else entirely (a live practitioner, held).
-- [consolidated] folded into the CREATE TYPE above: alter type practitioner_status add value if not exists 'Pending';

-- ── 2. Applications speak the V7 stage vocabulary ───────────────────────────
-- The V7 values were added in 0007; this retires the pre-V7 synonyms on live
-- rows. Sanctioned by the client directive that V7 is the sole spec and older
-- vocabularies are to be purged.
update practitioner_applications set status = 'Applied'        where status = 'New';
update practitioner_applications set status = 'Screening Done' where status = 'Screening';
update practitioner_applications set status = 'Rejected'       where status = 'Declined';

-- A new application enters the pipeline at 'Applied', not 'New'.
alter table practitioner_applications alter column status set default 'Applied';

-- ── 3. Admin notes ──────────────────────────────────────────────────────────
-- The detail card's "Notes" button. In V7 it is a `showToast('Notes saved')`
-- placeholder with nothing behind it; a control that looks like it saves and
-- does not is a defect, so it gets somewhere real to write.
alter table practitioner_applications add column if not exists admin_notes text;

-- ── 4. Reference numbers ────────────────────────────────────────────────────
-- `practitioners.reference` and `practitioner_agreements.reference` are unique
-- and human-quotable (IQC-EMP-0042). Until now nothing generated them, because
-- nothing created these rows outside a seed. "Generate & send agreement" does,
-- so they need a source.
--
-- A sequence rather than `max(reference) + 1`: two admins clicking at once
-- would read the same max, and the loser hits the unique constraint. A sequence
-- hands out distinct values without a lock and without a retry loop.
create sequence if not exists practitioner_reference_seq start 1;
create sequence if not exists agreement_reference_seq    start 1;

-- Existing rows already hold references; start the sequences past them so the
-- first generated value cannot collide with a seeded one.
select setval(
  'practitioner_reference_seq',
  greatest(
    coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from practitioners), 0),
    1
  )
);
select setval(
  'agreement_reference_seq',
  greatest(
    coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from practitioner_agreements), 0),
    1
  )
);

create or replace function next_reference(kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  case kind
    when 'practitioner' then return 'IQC-EMP-' || lpad(nextval('practitioner_reference_seq')::text, 4, '0');
    when 'agreement'    then return 'IQC-AGR-' || lpad(nextval('agreement_reference_seq')::text, 4, '0');
    else raise exception 'unknown reference kind: %', kind;
  end case;
end $$;

-- Only the service role calls this; it runs behind the console's own auth.
revoke execute on function next_reference(text) from public, anon, authenticated;

-- ── 5. The join the console pipeline reads ──────────────────────────────────
-- `practitioners.application_id` already exists but is unindexed, and the union
-- read resolves every practitioner back to their application to recover the
-- profile fields (state, address, t-shirt size, experience, phone).
create index if not exists practitioners_application_idx
  on practitioners (application_id)
  where deleted_at is null;

-- The pipeline is ordered by stage then recency, and filtered to live rows.
create index if not exists practitioner_applications_stage_idx
  on practitioner_applications (status, created_at desc)
  where deleted_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0009_link_practitioner_applications.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Link practitioners to the applications they came from.
--
-- `practitioners.application_id` has existed since 0002 but nothing populated
-- it: rows seeded before the console could promote an application have it null.
-- The console's pipeline read papers over that by matching on email, but every
-- WRITE that has to walk a practitioner back a stage — clearing a signature
-- captured in error, for one — needs the real link, and a read-side fallback
-- does not give it one.
--
-- Matching on lowercased email is the same identity the rest of the schema
-- already keys on (both tables carry a `lower(email)` index for it).
--
-- Idempotent and conservative: it fills only rows that are null, and only where
-- exactly ONE live application matches. An ambiguous email is left alone rather
-- than linked to a guess.

update practitioners p
set    application_id = matched.id
from (
  select a.id, lower(a.email) as email
  from   practitioner_applications a
  where  a.deleted_at is null
  group  by a.id, lower(a.email)
) matched
where p.application_id is null
  and p.deleted_at is null
  and lower(p.email) = matched.email
  and (
    select count(*)
    from   practitioner_applications a2
    where  a2.deleted_at is null
      and  lower(a2.email) = lower(p.email)
  ) = 1;

-- An application whose practitioner is already empanelled has ended; leaving it
-- at an earlier stage makes the two records disagree about the same event. The
-- console resolves that disagreement in the practitioner's favour when it
-- reads, but a read-time reconciliation is not a reason to store the wrong
-- value — the next writer would trust it.
update practitioner_applications a
set    status = 'Empanelled'
from   practitioners p
where  p.application_id = a.id
  and  p.deleted_at is null
  and  a.deleted_at is null
  and  p.status in ('Empanelled', 'Deactivated')
  and  a.status <> 'Empanelled';

-- ══════════════════════════════════════════════════════════════════════════
-- 0010_session_request_assignment.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Session-request assignment (V7 tab 3).
--
-- The V7 console captures three things on a request that this schema had
-- nowhere to put: which practitioner agreed to it, the gross payout agreed with
-- them, and the minimum number of participants the client committed to.
--
-- They belong on the REQUEST, not on the session, because V7 records them while
-- the request is still 'New' — they are the terms agreed on the phone, before
-- anything is matched. Matching is what turns them into a session and an
-- assignment; until then they are intent, and intent with no home is why this
-- panel could not be cloned.
--
-- Additive and idempotent. Nothing is backfilled: a request that predates this
-- genuinely has no agreed terms, and inventing one would be worse than null.

alter table session_requests
  add column if not exists assigned_practitioner_id uuid references practitioners (id),
  -- Numeric, not text: it is money, and it is copied into
  -- session_practitioners.gross_payout on match.
  add column if not exists agreed_gross_payout numeric(12, 2),
  -- The floor the client commits to, which is not the same as `group_size` —
  -- that is the expected range ("16–25"), this is what they guarantee.
  add column if not exists min_commitment integer;

do $$ begin
  alter table session_requests
    add constraint agreed_gross_payout_nonneg check (agreed_gross_payout >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table session_requests
    add constraint min_commitment_positive check (min_commitment > 0);
exception when duplicate_object then null; end $$;

-- The panel groups by assignee and the Session Details tab joins back through
-- it; without this both seq-scan once the table grows.
create index if not exists session_requests_assignee_idx
  on session_requests (assigned_practitioner_id)
  where deleted_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0011_session_references.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Session and confirmation references.
--
-- Matching a request creates a session and its assignment, and both carry a
-- unique human-quotable reference (IQC-S0007, IQC-CONF-0012) that appears in
-- emails and on the consent page. 0008 introduced the sequence-backed generator
-- for practitioners and agreements; these are the same mechanism for the two
-- rows the match step creates.
--
-- A sequence rather than max()+1, for the same reason as 0008: two admins
-- matching at once would read the same max and one would hit the unique
-- constraint.

create sequence if not exists session_reference_seq      start 1;
create sequence if not exists confirmation_reference_seq start 1;

-- Start past anything already seeded so a generated value cannot collide.
select setval(
  'session_reference_seq',
  greatest(coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from sessions), 0), 1)
);
select setval(
  'confirmation_reference_seq',
  greatest(
    coalesce(
      (select max(nullif(regexp_replace(confirmation_reference, '\D', '', 'g'), '')::bigint)
       from session_practitioners),
      0
    ),
    1
  )
);

create or replace function next_reference(kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  case kind
    when 'practitioner' then return 'IQC-EMP-'  || lpad(nextval('practitioner_reference_seq')::text, 4, '0');
    when 'agreement'    then return 'IQC-AGR-'  || lpad(nextval('agreement_reference_seq')::text, 4, '0');
    when 'session'      then return 'IQC-S'     || lpad(nextval('session_reference_seq')::text, 4, '0');
    when 'confirmation' then return 'IQC-CONF-' || lpad(nextval('confirmation_reference_seq')::text, 4, '0');
    else raise exception 'unknown reference kind: %', kind;
  end case;
end $$;

revoke execute on function next_reference(text) from public, anon, authenticated;

-- A session's date is agreed after the match, so it cannot be NOT NULL at the
-- moment the match creates the row. The V7 flow confirms the date on the call
-- that follows; until then "no date yet" is the truth.
alter table sessions alter column session_date drop not null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0012_confirmation_generated.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Whether a session's confirmation has actually been generated (V7 tab 4).
--
-- `confirmation_reference` is allocated when a request is matched, because the
-- column is NOT NULL and unique — but having a reference is not the same as
-- having issued the document. V7's Session Consent tab is built on that
-- distinction: Part 1 lists matched sessions with no confirmation yet, Part 2
-- lists the ones generated, and its empty state reads "No confirmations
-- generated yet".
--
-- `confirmation_issued_on` cannot carry this: it defaults to current_date, so
-- it is set from the moment the row exists and can never mean "not yet".
--
-- Additive and idempotent. Deliberately NOT backfilled: an assignment created
-- before this genuinely has no generated confirmation, and dating one to the
-- migration would put a document in the log that nobody produced.

alter table session_practitioners
  add column if not exists confirmation_generated_at timestamptz;

-- Part 2 lists generated confirmations newest-first; Part 1 lists the ones that
-- are not generated yet. One partial index serves the first, the predicate the
-- second.
create index if not exists session_practitioners_confirmed_idx
  on session_practitioners (confirmation_generated_at desc)
  where deleted_at is null and confirmation_generated_at is not null;

create index if not exists session_practitioners_awaiting_confirmation_idx
  on session_practitioners (session_id)
  where deleted_at is null and confirmation_generated_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0013_manual_rating.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Ratings an admin recorded from a verbal report (V7 tab 5).
--
-- The Session Details tab lets a Global Admin key in a rating the requestor
-- gave on the phone ("Got it verbally? — Record manually"). Stored, that rating
-- is indistinguishable from one the requestor submitted themselves through the
-- rating link — and they are not the same evidence. A practitioner's average is
-- built from these, so the difference matters.
--
-- `recorded_by` holds the admin who keyed it in; null means the requestor
-- submitted it directly. Nullable and additive, so every existing rating keeps
-- its meaning without a backfill.

alter table session_ratings
  add column if not exists recorded_by text;

comment on column session_ratings.recorded_by is
  'Admin who recorded this rating from a verbal report. NULL = submitted by the requestor through the rating link.';

-- ══════════════════════════════════════════════════════════════════════════
-- 0014_payout_settlement.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Payout settlement (V7 tab 7).
--
-- The Payouts tab tracks money out: an invoice reference the finance team
-- quotes, and whether the transfer has actually happened. Neither had anywhere
-- to live, so `listPayouts` hard-coded every row to "Pending" — a finance view
-- that cannot record a payment is a list, not a ledger.
--
-- These live on `session_practitioners` because a payout IS an assignment
-- settled: the gross figure is already there, agreed at match and confirmed on
-- the consent record. A separate payouts table would duplicate the amount and
-- immediately risk disagreeing with it.
--
-- Additive and idempotent. No backfill: an unpaid assignment is the truth for
-- every existing row, and dating a payment nobody made would be worse than a
-- gap.

alter table session_practitioners
  add column if not exists invoice_reference text,
  add column if not exists paid_on date;

-- An invoice reference is quoted between the platform and its accountants, so
-- two assignments must not share one.
create unique index if not exists session_practitioners_invoice_idx
  on session_practitioners (invoice_reference)
  where invoice_reference is not null and deleted_at is null;

-- The tab's default view is "what is still owed", so the unpaid set is the one
-- worth indexing.
create index if not exists session_practitioners_unpaid_idx
  on session_practitioners (confirmation_issued_on desc)
  where paid_on is null and deleted_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0015_gallery_drafts.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Gallery drafts (V7 tab 8).
--
-- V7's gallery is two stages: photos are uploaded into a DRAFT area, given a
-- city and a caption there, and only then published to the landing page. The
-- `published` flag already models the two stages, but `caption` and `city` were
-- NOT NULL — so a draft could not exist before someone had typed both, which is
-- the opposite of the order the tab works in.
--
-- Nullable here, and required at PUBLISH time instead (enforced in the publish
-- action): the constraint belongs where the promise is made, which is when a
-- photo goes live on a public page, not when it is dropped into a staging area.

alter table gallery_photos alter column caption drop not null;
alter table gallery_photos alter column city    drop not null;

-- A published photo must carry both, since the landing page renders them.
do $$ begin
  alter table gallery_photos
    add constraint published_photos_are_captioned
    check (
      not published
      or (caption is not null and length(btrim(caption)) > 0
          and city is not null and length(btrim(city)) > 0)
    );
exception when duplicate_object then null; end $$;

-- The tab reads drafts and live photos as two separate lists.
create index if not exists gallery_photos_stage_idx
  on gallery_photos (published, created_at desc)
  where deleted_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- 0016_email_log.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Every outbound email attempt, successful or not.
--
-- The system sends fifteen kinds of transactional mail and, until now, kept no
-- record of any of it. When a practitioner said an onboarding link never
-- arrived there was nothing to check: not whether it was attempted, not what
-- the provider said, not whether the address was even valid. Brevo's own
-- dashboard only knows about attempts that reached Brevo, which excludes every
-- interesting failure — missing config, an unsendable address, a timeout.
--
-- Written on every attempt, including dry runs, so the log tells the same story
-- in every environment.
create table if not exists public.email_log (
  id            uuid primary key default gen_random_uuid(),
  -- Ties a send back to the request that should have caused it.
  trace_id      text        not null,
  -- Slug from lib/email/templates.ts, e.g. 'practitioner-welcome'.
  template      text        not null,
  recipient     text        not null,
  stream        text        not null,
  -- One of the EmailStatus values in lib/email/outcome.ts.
  status        text        not null,
  ok            boolean     not null,
  error_code    text,
  error_message text,
  retry_count   integer     not null default 0,
  -- Brevo's id when it accepted the message. Acceptance is not delivery.
  provider_message_id text,
  created_at    timestamptz not null default now()
);

-- The duplicate check: "has this template gone to this address recently?".
-- Ordered so the newest row for a pair is the first one read.
create index if not exists email_log_dedupe_idx
  on public.email_log (template, recipient, created_at desc);

-- The support question — "what happened to this person's mail?".
create index if not exists email_log_recipient_idx
  on public.email_log (recipient, created_at desc);

-- The operations question — "what is failing right now?".
create index if not exists email_log_failures_idx
  on public.email_log (created_at desc)
  where ok = false;

-- Service-role only. Nothing in the browser reads this: it holds every address
-- the system has ever mailed, and the console reaches it through a server
-- action that has already checked the caller.
alter table public.email_log enable row level security;

commit;
