-- Widen the audit trail to cover regular-admin actions, not just Super Admin.
-- `actor_role` distinguishes who performed the logged action; existing rows
-- were all written by Super Admin destructive actions, so backfill accordingly.
-- Idempotent and non-destructive — safe to re-run.

ALTER TABLE super_admin_audit_log
  ADD COLUMN IF NOT EXISTS actor_role TEXT NOT NULL DEFAULT 'super_admin'
    CHECK (actor_role IN ('admin', 'super_admin'));

UPDATE super_admin_audit_log SET actor_role = 'super_admin' WHERE actor_role IS NULL;

CREATE INDEX IF NOT EXISTS super_admin_audit_log_actor_role_idx
  ON super_admin_audit_log (actor_role);
