-- Photo submissions table.
-- touch_updated_at() created in 0008 — runs first.

CREATE TABLE IF NOT EXISTS photo_submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_ref    TEXT        NOT NULL,
  session_ref         TEXT        NOT NULL,
  module              TEXT        NOT NULL,
  city                TEXT        NOT NULL,
  state               TEXT        NOT NULL,
  org                 TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date         DATE        NOT NULL,
  photo_count         INTEGER     NOT NULL CHECK (photo_count BETWEEN 1 AND 10),
  storage_keys        TEXT[]      NOT NULL DEFAULT '{}',
  participant_consent BOOLEAN     NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Expired')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_photo_submissions_updated_at ON photo_submissions;
CREATE TRIGGER trg_photo_submissions_updated_at
  BEFORE UPDATE ON photo_submissions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything.
DROP POLICY IF EXISTS "admin_all_photo_submissions" ON photo_submissions;
CREATE POLICY "admin_all_photo_submissions"
  ON photo_submissions FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- Anyone can insert (practitioner submitting photos via signed link).
-- participant_consent must be TRUE — enforced in WITH CHECK.
DROP POLICY IF EXISTS "public_insert_photo_submissions" ON photo_submissions;
CREATE POLICY "public_insert_photo_submissions"
  ON photo_submissions FOR INSERT
  TO anon
  WITH CHECK (participant_consent = TRUE);
