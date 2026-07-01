-- Real-time for the remaining live surfaces:
--   super_admin_audit_log -> Activity feed (SA-only)
--   admin_invites         -> invites list in Credentials (SA-only)
--   session_feedback      -> ratings shown inside Sessions (admins)
--   gallery_photos        -> admin Gallery + PUBLIC homepage gallery
-- Same pattern: RLS + SELECT policy the subscriber satisfies + realtime
-- publication. Server reads/writes use the service-role key (RLS-bypassing).
-- Idempotent and non-destructive.

DO $$
DECLARE
  t text;
BEGIN
  -- SA-only tables (audit log + invites) -------------------------------------
  FOREACH t IN ARRAY ARRAY['super_admin_audit_log', 'admin_invites'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='super admins read '||t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO authenticated '
        || 'USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''super_admin'')',
        'super admins read ' || t, t
      );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;

  -- Admin-readable table (session feedback) ----------------------------------
  EXECUTE 'ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY';
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_feedback' AND policyname='admins read session_feedback') THEN
    CREATE POLICY "admins read session_feedback" ON session_feedback
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='session_feedback') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_feedback;
  END IF;
END $$;

-- gallery_photos: admins read all; the PUBLIC (anon) may read only PUBLISHED
-- photos, so the homepage gallery can update live without exposing drafts.
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gallery_photos' AND policyname='admins read gallery_photos') THEN
    CREATE POLICY "admins read gallery_photos" ON gallery_photos
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gallery_photos' AND policyname='public reads published gallery_photos') THEN
    CREATE POLICY "public reads published gallery_photos" ON gallery_photos
      FOR SELECT TO anon
      USING (published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='gallery_photos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE gallery_photos;
  END IF;
END $$;
