-- The empanelment reference is issued when someone is empanelled, not before.
--
-- `practitioners.reference` was allocated the moment an admin generated the
-- agreement — the row has to exist for the agreement to point at, and it was
-- given its IQC-EMP number on the way past. So an applicant who never signed
-- still consumed one, and the agreement email quoted a number that identified
-- an empanelment that had not happened.
--
-- The client's agreement JSON is explicit that these are two different things:
-- the Agreement Reference Number (IQC-AGR) is "assigned earlier by the admin
-- when the agreement is issued" and is what the onboarding page shows, while
-- the Empanelment Reference Number (IQC-EMP) is "generated once the
-- practitioner submits the signed agreement".
--
-- The console already described it this way — `services/console.ts` documents
-- the column as "Assigned at empanelment — null before it, never invented" —
-- so this makes the schema agree with the sentence that was already there.
--
-- Nullable, not removed: the column keeps its UNIQUE index, and Postgres treats
-- NULLs as distinct, so any number of unsigned practitioners can sit without
-- one while every issued number stays unique.
--
-- Idempotent: dropping a NOT NULL that is already dropped is a no-op in
-- Postgres, so re-running this changes nothing.
alter table public.practitioners
  alter column reference drop not null;

comment on column public.practitioners.reference is
  'IQC-EMP number, allocated when the signature empanels the practitioner. Null while an agreement is out but unsigned — never invented, and never allocated to someone who has not signed.';
