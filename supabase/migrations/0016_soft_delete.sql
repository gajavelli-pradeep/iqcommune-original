-- 0016 — Soft-delete for core tables (Gap #11 / G-SA8)
-- Adds a nullable deleted_at to the 5 core tables so Super-Admin deletes can
-- become reversible within a grace window instead of destroying data instantly.
-- This migration adds the columns, active-row indexes, and the purge function.
-- Application wiring (switch DELETE routes to set deleted_at; add
-- `.is("deleted_at", null)` to reads) is a follow-up — see OPEN-ITEMS.md.
-- Fully idempotent + re-runnable.

ALTER TABLE practitioners    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE session_requests ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE sessions         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE agreements       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payouts          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes keep the common "active rows only" scans fast once reads
-- start filtering on deleted_at IS NULL.
CREATE INDEX IF NOT EXISTS practitioners_active_idx    ON practitioners(created_at DESC)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS session_requests_active_idx ON session_requests(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS sessions_active_idx         ON sessions(session_date)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agreements_active_idx       ON agreements(created_at DESC)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS payouts_active_idx          ON payouts(created_at DESC)          WHERE deleted_at IS NULL;

-- Grace-window hard purge. Call from a scheduled job (pg_cron or an app cron
-- route), e.g. daily: SELECT * FROM purge_soft_deleted();  -- default 30 days
-- Deletes child rows before parents, and each parent delete is guarded by
-- NOT EXISTS on any still-present referencing row, so the purge can never trip
-- a foreign-key violation regardless of how completely the app cascades a
-- soft-delete. Returns a per-table purged-row count.
CREATE OR REPLACE FUNCTION purge_soft_deleted(retention INTERVAL DEFAULT INTERVAL '30 days')
RETURNS TABLE (table_name TEXT, purged BIGINT) LANGUAGE plpgsql AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - retention;
  n      BIGINT;
BEGIN
  DELETE FROM payouts
   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'payouts'; purged := n; RETURN NEXT;

  DELETE FROM agreements
   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'agreements'; purged := n; RETURN NEXT;

  DELETE FROM sessions s
   WHERE s.deleted_at IS NOT NULL AND s.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM payouts p WHERE p.session_id = s.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'sessions'; purged := n; RETURN NEXT;

  DELETE FROM session_requests r
   WHERE r.deleted_at IS NOT NULL AND r.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.request_id = r.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'session_requests'; purged := n; RETURN NEXT;

  DELETE FROM practitioners p
   WHERE p.deleted_at IS NOT NULL AND p.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM sessions         s   WHERE s.practitioner_id   = p.id)
     AND NOT EXISTS (SELECT 1 FROM agreements       a   WHERE a.practitioner_id   = p.id)
     AND NOT EXISTS (SELECT 1 FROM payouts          pay WHERE pay.practitioner_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM session_requests r   WHERE r.assigned_to       = p.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'practitioners'; purged := n; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION purge_soft_deleted(INTERVAL) TO service_role;
