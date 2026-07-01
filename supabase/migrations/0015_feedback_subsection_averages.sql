-- 0015 — Per-practitioner subsection feedback averages (Gap #10 / G-F7)
-- session_feedback.subsections stores { content, delivery, engagement,
-- logistics } numeric scores per session, but they were never aggregated for
-- the practitioner expanded row. This view exposes the averages so the app can
-- read them in one query. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE VIEW practitioner_subsection_averages AS
SELECT
  practitioner_id,
  -- jsonb_typeof guard: only average keys that are genuinely numeric, so a
  -- missing key (NULL) is skipped and a malformed value can never error the view.
  ROUND(AVG(CASE WHEN jsonb_typeof(subsections->'content')    = 'number' THEN (subsections->>'content')::numeric    END), 2) AS content_avg,
  ROUND(AVG(CASE WHEN jsonb_typeof(subsections->'delivery')   = 'number' THEN (subsections->>'delivery')::numeric   END), 2) AS delivery_avg,
  ROUND(AVG(CASE WHEN jsonb_typeof(subsections->'engagement') = 'number' THEN (subsections->>'engagement')::numeric END), 2) AS engagement_avg,
  ROUND(AVG(CASE WHEN jsonb_typeof(subsections->'logistics')  = 'number' THEN (subsections->>'logistics')::numeric  END), 2) AS logistics_avg,
  COUNT(*) AS rated_sessions
FROM session_feedback
WHERE subsections IS NOT NULL
GROUP BY practitioner_id;

-- App routes read via the service role.
GRANT SELECT ON practitioner_subsection_averages TO service_role;
