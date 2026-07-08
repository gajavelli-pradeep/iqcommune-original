-- 0027 — Allow 'global_admin' in RLS policies + audit CHECK (super→global rename)
-- Run AFTER 0026. The DB hard-coded 'super_admin' in (a) the admin_audit_log
-- actor_role CHECK and (b) every role-gated Realtime SELECT policy. Since the
-- Global Admin account now carries role='global_admin', add it (keeping the
-- legacy 'super_admin' too, for safety) so audit writes and client Realtime
-- subscriptions keep working. Idempotent + re-runnable.

-- 1) admin_audit_log.actor_role CHECK → allow global_admin -------------------
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.admin_audit_log'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%actor_role%'
   LIMIT 1;
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE admin_audit_log DROP CONSTRAINT %I', c); END IF;
END $$;

ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_actor_role_chk
  CHECK (actor_role IN ('admin', 'super_admin', 'global_admin'));

-- 2) admin-tier Realtime SELECT policies → add global_admin ------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'session_requests','photo_submissions','practitioners','sessions',
    'payouts','agreements','session_feedback','gallery_photos'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'admins read ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated '
      || 'USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''admin'', ''super_admin'', ''global_admin''))',
      'admins read ' || t, t
    );
  END LOOP;
END $$;

-- 3) global-only Realtime SELECT policies (audit log + invites) --------------
DROP POLICY IF EXISTS "super admins read super_admin_audit_log" ON admin_audit_log;
DROP POLICY IF EXISTS "super admins read admin_audit_log"       ON admin_audit_log;
DROP POLICY IF EXISTS "global admins read admin_audit_log"      ON admin_audit_log;
CREATE POLICY "global admins read admin_audit_log" ON admin_audit_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'global_admin'));

DROP POLICY IF EXISTS "super admins read admin_invites"  ON admin_invites;
DROP POLICY IF EXISTS "global admins read admin_invites" ON admin_invites;
CREATE POLICY "global admins read admin_invites" ON admin_invites
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'global_admin'));
