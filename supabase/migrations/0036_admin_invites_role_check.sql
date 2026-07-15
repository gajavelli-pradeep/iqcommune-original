-- 0036 — Widen admin_invites.role CHECK to the roles the app actually invites.
-- 0019 created the table when 'admin' was the only invite role, pinning it with
-- CHECK (role = 'admin'). The Settings invite has since been V5-widened to also
-- provision a read-only User and a Global Admin — the API accepts all three
-- (app/api/admin/global/invites/route.ts) and the accept flow provisions all
-- three (app/api/onboarding/admin-accept/route.ts) — but the CHECK was never
-- updated. 0027 fixed the same stale-CHECK bug on admin_audit_log.actor_role and
-- missed this one, so every 'user' / 'global_admin' invite failed the insert and
-- surfaced as a generic "Failed to create invite" 500.
--
-- Widening a CHECK is expand-only: every existing row (all role='admin') stays
-- valid, so this needs no backfill and is safe to run against live data.
-- Idempotent + re-runnable.

DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'public.admin_invites'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%role%'
   LIMIT 1;
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE admin_invites DROP CONSTRAINT %I', c); END IF;
END $$;

ALTER TABLE admin_invites
  ADD CONSTRAINT admin_invites_role_check
  CHECK (role IN ('admin', 'user', 'global_admin'));
