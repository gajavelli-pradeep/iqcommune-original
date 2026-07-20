-- V6 §12: the Activity log now has a genuine 90-day rolling retention (not just a
-- read-side display filter). This prunes admin_audit_log rows older than the
-- retention window; Vercel Cron runs it daily (see vercel.json + the
-- /api/cron/prune-activity-log route). Mirrors the purge_soft_deleted pattern.
CREATE OR REPLACE FUNCTION prune_activity_log(retention INTERVAL DEFAULT INTERVAL '90 days')
RETURNS TABLE (table_name TEXT, purged BIGINT) LANGUAGE plpgsql AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - retention;
  n      BIGINT;
BEGIN
  DELETE FROM admin_audit_log WHERE created_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'admin_audit_log'; purged := n; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION prune_activity_log(INTERVAL) TO service_role;
