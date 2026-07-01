-- 0014 — Practitioner pipeline stage timestamps (Gap #8)
-- Records when each practitioner first entered each pipeline stage, so the
-- PipelineStepper can show a date beside every step (today only "Applied" =
-- created_at is available). Fully idempotent + re-runnable.

-- "Applied" is already covered by practitioners.created_at.
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS under_review_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS screened_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS empanelled_at     TIMESTAMPTZ;

-- Stamp the first arrival into each stage. A BEFORE UPDATE trigger fires no
-- matter which API path changes status (status route, onboarding-link route,
-- or the agreement→Empanelled promotion trigger), so no application code needs
-- to know about these columns. Idempotent per row: a stage timestamp is only
-- set while still NULL, so re-entering a stage never overwrites the first time.
CREATE OR REPLACE FUNCTION stamp_practitioner_pipeline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Under Review'   AND NEW.under_review_at   IS NULL THEN NEW.under_review_at   := NOW(); END IF;
    IF NEW.status = 'Screening Done' AND NEW.screened_at       IS NULL THEN NEW.screened_at       := NOW(); END IF;
    IF NEW.status = 'Agreement Sent' AND NEW.agreement_sent_at IS NULL THEN NEW.agreement_sent_at := NOW(); END IF;
    IF NEW.status = 'Empanelled'     AND NEW.empanelled_at     IS NULL THEN NEW.empanelled_at     := NOW(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER practitioners_stamp_pipeline
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION stamp_practitioner_pipeline();

-- Backfill from agreements where we have evidence:
--   earliest agreement created  ≈ entered "Agreement Sent"
--   latest agreement signed_at  ≈ became "Empanelled"
-- (screened_at / under_review_at have no historical source — left NULL; the
--  stepper simply shows no date for those steps until they next transition.)
UPDATE practitioners p
   SET agreement_sent_at = sub.first_created
  FROM (
    SELECT practitioner_id, MIN(created_at) AS first_created
    FROM   agreements GROUP BY practitioner_id
  ) sub
 WHERE sub.practitioner_id = p.id
   AND p.agreement_sent_at IS NULL
   AND p.status IN ('Agreement Sent', 'Empanelled');

UPDATE practitioners p
   SET empanelled_at = sub.last_signed
  FROM (
    SELECT practitioner_id, MAX(signed_at) AS last_signed
    FROM   agreements WHERE signed_at IS NOT NULL GROUP BY practitioner_id
  ) sub
 WHERE sub.practitioner_id = p.id
   AND p.empanelled_at IS NULL
   AND p.status = 'Empanelled';
