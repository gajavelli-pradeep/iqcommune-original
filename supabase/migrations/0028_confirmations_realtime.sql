-- 0028 — Realtime for confirmations (live Session Consent updates)
-- Client Realtime obeys RLS, and confirmations (0025) has RLS enabled with NO
-- SELECT policy → subscribers receive nothing. Add an admin/global SELECT policy
-- and put the table in the realtime publication. Server reads/writes use the
-- service-role key (RLS-bypassing), so this only gates the new subscription.
-- Idempotent + re-runnable.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'confirmations'
      AND policyname = 'admins read confirmations'
  ) THEN
    CREATE POLICY "admins read confirmations" ON confirmations
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'global_admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'confirmations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE confirmations;
  END IF;
END $$;
