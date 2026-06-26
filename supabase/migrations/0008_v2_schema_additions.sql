-- v2: add state/city/phone/spoc_declaration to existing tables,
--     fix group_size cap (16-20 → 16-25), add updated_at to 4 tables.

-- ── practitioners ─────────────────────────────────────────────────────────────
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── session_requests ──────────────────────────────────────────────────────────
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS state            TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS phone            TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS org_name         TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS notes            TEXT;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS spoc_declaration BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop the existing group_size CHECK constraint (name varies by migration tool)
-- then re-add with the corrected cap of 25.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM   pg_constraint
  WHERE  conrelid = 'session_requests'::regclass
    AND  contype  = 'c'
    AND  pg_get_constraintdef(oid) LIKE '%group_size%';
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE session_requests DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

ALTER TABLE session_requests
  ADD CONSTRAINT session_requests_group_size_check
  CHECK (group_size IN ('5-8', '9-15', '16-25'));

-- ── updated_at on the 4 tables that were missing it ──────────────────────────

-- Shared trigger function (CREATE OR REPLACE is idempotent).
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- session_requests
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_session_requests_updated_at ON session_requests;
CREATE TRIGGER trg_session_requests_updated_at
  BEFORE UPDATE ON session_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- agreements
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_agreements_updated_at ON agreements;
CREATE TRIGGER trg_agreements_updated_at
  BEFORE UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- payouts
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_payouts_updated_at ON payouts;
CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
