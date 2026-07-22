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
