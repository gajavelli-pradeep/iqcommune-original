-- 0026 — Rename super_admin_audit_log → admin_audit_log
-- Part of the "super admin" → "global admin" rename. The table logs both
-- global-admin governance and regular-admin pipeline actions, so the neutral
-- name fits better. RLS policies, indexes, and realtime-publication membership
-- all follow the table automatically on RENAME. Idempotent + re-runnable.

ALTER TABLE IF EXISTS super_admin_audit_log RENAME TO admin_audit_log;
