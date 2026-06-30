-- Add rating aggregates to practitioners
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS avg_rating    NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS feedback_count INTEGER      NOT NULL DEFAULT 0;

-- One feedback record per session
CREATE TABLE IF NOT EXISTS session_feedback (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES sessions(id)      ON DELETE CASCADE,
  practitioner_id  UUID        NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  -- overall_rating drives avg; nullable so comments-only entries are allowed
  overall_rating   NUMERIC(3,1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  -- { content, delivery, engagement, logistics } — informational, not averaged
  subsections      JSONB,
  comments         TEXT,
  collected_by     TEXT,
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_feedback_session_uniq UNIQUE (session_id)
);

-- Recompute avg_rating + feedback_count whenever session_feedback changes
CREATE OR REPLACE FUNCTION recalc_practitioner_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.practitioner_id, OLD.practitioner_id);

  UPDATE practitioners
  SET
    avg_rating = COALESCE(
      (SELECT ROUND(AVG(overall_rating)::NUMERIC, 2)
       FROM   session_feedback
       WHERE  practitioner_id = pid AND overall_rating IS NOT NULL),
      0
    ),
    feedback_count = (
      SELECT COUNT(*) FROM session_feedback WHERE practitioner_id = pid
    )
  WHERE id = pid;

  RETURN NULL;
END;
$$;

CREATE TRIGGER session_feedback_rating_sync
  AFTER INSERT OR UPDATE OR DELETE ON session_feedback
  FOR EACH ROW EXECUTE FUNCTION recalc_practitioner_rating();
