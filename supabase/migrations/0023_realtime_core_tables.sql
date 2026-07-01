-- Real-time rollout: the remaining core console tables.
-- Same pattern as 0022 (RLS + admin-only SELECT policy + realtime publication),
-- applied to practitioners, sessions, payouts, agreements via a loop. Server
-- reads/writes use the service-role key (RLS-bypassing) and the public site does
-- not read these tables with the anon client, so enabling RLS is safe — it only
-- gates the new client Realtime subscriptions. Idempotent and non-destructive.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['practitioners', 'sessions', 'payouts', 'agreements'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = 'admins read ' || t
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO authenticated '
        || 'USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''admin'', ''super_admin''))',
        'admins read ' || t, t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
