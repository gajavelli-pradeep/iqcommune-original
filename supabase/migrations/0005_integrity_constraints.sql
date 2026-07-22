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
