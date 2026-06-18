-- Trigger: auto-promote practitioner to Empanelled when their agreement
-- transitions to Active. This makes the promotion atomic with the agreement
-- update (single Postgres transaction) rather than relying on a separate
-- application-layer DB call that can fail independently.

CREATE OR REPLACE FUNCTION promote_practitioner_on_agreement_active()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'Active' AND OLD.status = 'Pending signature' THEN
    UPDATE practitioners
    SET status = 'Empanelled'
    WHERE id = NEW.practitioner_id
      AND status != 'Empanelled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER agreements_promote_practitioner
  AFTER UPDATE ON agreements
  FOR EACH ROW EXECUTE FUNCTION promote_practitioner_on_agreement_active();
