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
alter type practitioner_status add value if not exists 'Pending';

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
