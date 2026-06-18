-- Atomic ref_code generation via Postgres sequence.
-- Replaces the racy count+1 approach in the API route.

CREATE SEQUENCE IF NOT EXISTS practitioner_ref_seq;

-- Seed the sequence above any existing ref_codes so there are no collisions.
DO $$
DECLARE
  max_ref INT;
BEGIN
  SELECT COALESCE(MAX(ref_code::int), 0)
    INTO max_ref
    FROM practitioners
   WHERE ref_code ~ '^[0-9]+$';
  -- Postgres sequences have a minimum of 1; setval(seq, 0) throws a RangeError.
  PERFORM setval('practitioner_ref_seq', GREATEST(max_ref, 1));
END $$;

CREATE OR REPLACE FUNCTION next_practitioner_ref()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT lpad(nextval('practitioner_ref_seq')::text, 4, '0');
$$;

GRANT EXECUTE ON FUNCTION next_practitioner_ref() TO service_role;
