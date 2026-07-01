-- Real-time (pilot): Session Requests + Session Photos.
-- Client-side Supabase Realtime obeys RLS, so each live table needs (a) to be in
-- the `supabase_realtime` publication and (b) an RLS SELECT policy the signed-in
-- admin satisfies. Writes/reads on the server use the service-role key (which
-- bypasses RLS), so enabling RLS does NOT affect existing server queries or the
-- public submission endpoints — it only gates the new client subscription.
-- Admins are identified by app_metadata.role in their JWT.
-- Idempotent and non-destructive (no DROPs) — safe to re-run.

-- session_requests ----------------------------------------------------------
ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_requests'
      AND policyname = 'admins read session_requests'
  ) THEN
    CREATE POLICY "admins read session_requests" ON session_requests
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_requests;
  END IF;
END $$;

-- photo_submissions ---------------------------------------------------------
ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'photo_submissions'
      AND policyname = 'admins read photo_submissions'
  ) THEN
    CREATE POLICY "admins read photo_submissions" ON photo_submissions
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'photo_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE photo_submissions;
  END IF;
END $$;
