-- The practitioner's state, alongside the city they already carry.
--
-- The empanelment agreement's header is four rows — Name, City, State,
-- Empanelment Reference Number (client's agreement JSON, 2026-08-15) — and the
-- onboarding page shows the same four before signing. Three of them resolve
-- from `practitioners` today; `state` had nowhere to come from.
--
-- It is held here rather than read through `application_id` for the reason
-- `city` and `email` already are: the practitioner record is what the agreement
-- and the signed PDF render from, and a contract that resolves its own header
-- through a join to a record an admin may soft-delete is a contract that can
-- lose a field it has already been signed with. `overridePractitionerField`
-- keeps the two copies in step, as it does for the other duplicated columns.
--
-- Nullable, deliberately. `city` is `not null` because every application has
-- always collected one; `state` arrived later, so older applications have none,
-- and a practitioner seeded with no application behind them has nothing to
-- inherit. Inventing a value to satisfy a constraint would put a guess in the
-- header of a legal document — a blank is honest and visible, a fabricated
-- state is neither.
alter table public.practitioners
  add column if not exists state text;

-- Backfill from the application each practitioner was promoted from. Rows with
-- no application, or an application predating the state field, stay null; the
-- promotion path fills it for everyone from here on.
update public.practitioners as p
   set state = a.state
  from public.practitioner_applications as a
 where p.application_id = a.id
   and p.state is null
   and a.state is not null;
