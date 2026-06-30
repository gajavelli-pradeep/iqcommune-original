-- Immutable record of every Super Admin destructive action.
-- Written before the delete executes so the snapshot is always present.
CREATE TABLE super_admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email  TEXT        NOT NULL,
  action       TEXT        NOT NULL, -- e.g. 'delete_practitioner', 'delete_session'
  record_table TEXT        NOT NULL,
  record_id    UUID        NOT NULL,
  snapshot     JSONB,                -- full record state captured before deletion
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX super_admin_audit_log_actor_idx      ON super_admin_audit_log (actor_email);
CREATE INDEX super_admin_audit_log_record_idx     ON super_admin_audit_log (record_table, record_id);
CREATE INDEX super_admin_audit_log_created_at_idx ON super_admin_audit_log (created_at DESC);
