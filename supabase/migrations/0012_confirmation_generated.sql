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
