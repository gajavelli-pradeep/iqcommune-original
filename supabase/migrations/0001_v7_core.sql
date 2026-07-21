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

create type session_request_status as enum ('New', 'Contacted', 'Scheduled', 'Closed', 'Cancelled');
create type audience_type as enum ('individual', 'corporate', 'finance');

create table session_requests (
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

create trigger session_requests_updated_at
  before update on session_requests
  for each row execute function set_updated_at();

-- Reads are "newest open requests first", so the index matches the query.
create index session_requests_triage_idx
  on session_requests (status, created_at desc)
  where deleted_at is null;
create index session_requests_email_idx on session_requests (lower(email));

-- ── GALLERY ─────────────────────────────────────────────────────────────────
-- Read by the public landing page; published from the admin console (P8).

create table gallery_photos (
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

create trigger gallery_photos_updated_at
  before update on gallery_photos
  for each row execute function set_updated_at();

create index gallery_photos_public_idx
  on gallery_photos (sort_order, created_at desc)
  where published and deleted_at is null;

-- ── PHOTO SUBMISSIONS ───────────────────────────────────────────────────────
-- Written by the public post-session photo modal.

create type photo_submission_status as enum ('Pending', 'Approved', 'Rejected', 'Expired');

create table photo_submissions (
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

create trigger photo_submissions_updated_at
  before update on photo_submissions
  for each row execute function set_updated_at();

create index photo_submissions_review_idx
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
create policy gallery_photos_public_read on gallery_photos
  for select
  to anon, authenticated
  using (published and deleted_at is null);

-- No anon insert policy on session_requests or photo_submissions: both are
-- written through a server route that validates, rate-limits and logs first.
-- Granting anon insert here would route around all three.
