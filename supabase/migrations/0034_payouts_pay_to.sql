-- 0034_payouts_pay_to.sql
-- Payouts: make "Pay to / Method / Invoice ref." manual (prefilled-but-editable)
-- fields. Purely additive & safe:
--   1. adds a nullable `pay_to` text column (payment-destination override),
--   2. adds a partial-unique index on `invoice_ref` — invoice refs are a financial
--      reference and manual entry must not create duplicates (soft-deleted rows
--      excluded so a re-created payout can reuse a ref).
-- `payment_method` and `invoice_ref` columns already exist; no change needed there.
--
-- No backfill: `pay_to` is a manual OVERRIDE only. The practitioner's UPI / bank
-- columns are encrypted at rest (see lib/encrypt.ts), so SQL cannot derive a
-- readable value here — a plain copy would persist ciphertext. When `pay_to` is
-- NULL the console derives the destination from the *decrypted* practitioner
-- fields on display (see PayoutTable `payToDisplay`). Corrective migration 0035
-- nulls any ciphertext written by an earlier version of this file.

-- 1. Payment-destination override. NULL = fall back to the derived UPI/bank string.
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS pay_to TEXT;

-- 2. Invoice refs stay unique among live rows.
--    Pre-check: older manual "Create payout" inserts had no uniqueness guard, so
--    live duplicates *could* exist and would make CREATE UNIQUE INDEX fail with a
--    cryptic error. Fail loudly first, naming the offending refs, so the operator
--    can resolve them before re-running (auto-mutating financial refs is unsafe).
DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(invoice_ref || ' (×' || cnt || ')', ', ')
    INTO dupes
  FROM (
    SELECT invoice_ref, count(*) AS cnt
    FROM payouts
    WHERE deleted_at IS NULL
    GROUP BY invoice_ref
    HAVING count(*) > 1
  ) d;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot add unique index: duplicate live invoice_ref values exist: %. Resolve these before re-running.', dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payouts_invoice_ref_unique
  ON payouts (invoice_ref)
  WHERE deleted_at IS NULL;
