-- A session lasts three hours or six. The database now says so too.
--
-- `duration_minutes` has exactly one writer in the application:
-- `generateConfirmation` stores `input.durationHours * 60`, having already
-- refused any `durationHours` outside `[3, 6]`. The code can therefore only
-- ever produce 180 or 360.
--
-- IQC-S0005 was holding 186. Nothing in the codebase can write that number, so
-- it arrived from outside the application — a hand edit or an import. It was
-- not inert: both surfaces that show a duration divide by 60 and print the
-- result, so the practitioner's consent page and their confirmation PDF each
-- read "3.1 hours" on a document stating the terms they are asked to agree to.
--
-- The application guard could not have caught it, because the application was
-- never the thing that wrote it. Only the database can refuse a write the
-- database itself receives, which is the whole argument for putting the rule
-- here rather than adding a second copy of it in TypeScript.
--
-- NULL stays legal. The column is empty for every session until its
-- confirmation is generated, which is most of them at any moment.
--
-- Idempotent: the drop precedes the add, so re-running replaces the constraint
-- with an identical one rather than failing on a name that already exists.
--
-- Already applied to the live database on 2026-08-15, ahead of this file — the
-- constraint was written to fix IQC-S0005 and is recorded here so the repo
-- describes the schema that actually exists.
alter table public.sessions
  drop constraint if exists sessions_duration_minutes_valid;

alter table public.sessions
  add constraint sessions_duration_minutes_valid
  check (duration_minutes is null or duration_minutes in (180, 360));

comment on column public.sessions.duration_minutes is
  'Session length: 180 (single module) or 360 (bundled, two modules), or null before the confirmation is generated. Constrained because a value the application cannot write still reached this column once.';
