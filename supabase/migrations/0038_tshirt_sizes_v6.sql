-- 0038 — align the t-shirt size constraint with the V6 application form.
--
-- Defect: the public empanelment form offers XS, S, M, L, XL, XXL, 3XL (matching the V6
-- client mockup), but the CHECK added in 0030 only allowed S, M, L, XL, XXL, XXXL.
-- Choosing XS or 3XL therefore failed the insert and the applicant lost the whole form to
-- a generic "Failed to save application" (verified live: XS -> HTTP 500, M -> 201).
--
-- The form is correct per the client's own mockup, so the constraint is what changes.
-- Note 0030 spelled the largest size XXXL while the form says 3XL — normalise to 3XL.
--
-- Idempotent and re-runnable.

-- 1. Normalise any legacy value before the stricter constraint is applied.
UPDATE practitioners SET tshirt_size = '3XL' WHERE tshirt_size = 'XXXL';

-- 2. Replace the constraint with the V6 set.
ALTER TABLE practitioners
  DROP CONSTRAINT IF EXISTS practitioners_tshirt_size_check;

ALTER TABLE practitioners
  ADD CONSTRAINT practitioners_tshirt_size_check
  CHECK (tshirt_size IS NULL OR tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'));

COMMENT ON COLUMN practitioners.tshirt_size IS
  'Preferred t-shirt size for the welcome kit (XS/S/M/L/XL/XXL/3XL — matches the V6 form).';
