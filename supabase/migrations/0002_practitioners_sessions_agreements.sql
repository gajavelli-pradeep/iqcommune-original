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

create type practitioner_application_status as enum
  ('New', 'Screening', 'Empanelled', 'Declined', 'Withdrawn');

create table practitioner_applications (
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

create trigger practitioner_applications_updated_at
  before update on practitioner_applications
  for each row execute function set_updated_at();

create index practitioner_applications_triage_idx
  on practitioner_applications (status, created_at desc)
  where deleted_at is null;

-- Applying twice is a duplicate to spot, not an error to reject, so this is an
-- index rather than a unique constraint.
create index practitioner_applications_email_idx
  on practitioner_applications (lower(email));

-- ── PRACTITIONERS ───────────────────────────────────────────────────────────

create type practitioner_status as enum ('Empanelled', 'Paused', 'Deactivated');

create table practitioners (
  id           uuid primary key default gen_random_uuid(),
  status       practitioner_status not null default 'Empanelled',
  -- Human-readable reference shown on the photo page (IQC-EMP-0042). Unique so
  -- it can be quoted in an email and resolve to exactly one person.
  reference    text not null unique,
  full_name    text not null,
  role         text not null,
  organisation text,
  city         text not null,
  email        text not null,
  application_id uuid references practitioner_applications (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger practitioners_updated_at
  before update on practitioners
  for each row execute function set_updated_at();

create index practitioners_email_idx on practitioners (lower(email));

-- ── AGREEMENTS ──────────────────────────────────────────────────────────────
-- One practitioner may hold several over time (renewal, revised terms), which
-- is why the /onboarding token names an agreement and not a practitioner: an
-- agreement resolves to exactly one practitioner, the reverse does not hold.

create table practitioner_agreements (
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

create trigger practitioner_agreements_updated_at
  before update on practitioner_agreements
  for each row execute function set_updated_at();

create index practitioner_agreements_practitioner_idx
  on practitioner_agreements (practitioner_id, issued_on desc)
  where deleted_at is null;

-- ── SESSIONS ────────────────────────────────────────────────────────────────

create type session_status as enum ('Scheduled', 'Delivered', 'Cancelled');

create table sessions (
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

create trigger sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

create index sessions_schedule_idx
  on sessions (session_date desc, status)
  where deleted_at is null;

-- ── SESSION ASSIGNMENTS ─────────────────────────────────────────────────────
-- The row /rate, /consent and /submit-photos actually name — see the
-- correction in ADR 0004. Payout and consent are per practitioner per session,
-- so neither can live on `sessions`, and a session with two practitioners makes
-- a session id ambiguous for all three pages.

create table session_practitioners (
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

create trigger session_practitioners_updated_at
  before update on session_practitioners
  for each row execute function set_updated_at();

create index session_practitioners_practitioner_idx
  on session_practitioners (practitioner_id)
  where deleted_at is null;

-- ── RATINGS ─────────────────────────────────────────────────────────────────
-- Its own row rather than columns on the assignment: a rating is a submission
-- with its own timestamp and its own audit trail.

create table session_ratings (
  id                      uuid primary key default gen_random_uuid(),
  session_practitioner_id uuid not null unique references session_practitioners (id),
  rating                  smallint not null check (rating between 1 and 5),
  comments                text,
  submitted_at            timestamptz not null default now(),
  submitted_ip            text
);

-- ── ADMIN INVITES ───────────────────────────────────────────────────────────

create type admin_role as enum ('global_admin', 'admin', 'user');

create table admin_invites (
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

create trigger admin_invites_updated_at
  before update on admin_invites
  for each row execute function set_updated_at();

create index admin_invites_open_idx
  on admin_invites (email)
  where consumed_at is null and deleted_at is null;

-- ── PHOTO SUBMISSIONS — link the tokenised path to its session ──────────────
-- Both nullable: the public landing-page modal keeps working with only a name
-- and email, while the tokenised page fills the references instead.

alter table photo_submissions
  add column session_id      uuid references sessions (id),
  add column practitioner_id uuid references practitioners (id);

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
