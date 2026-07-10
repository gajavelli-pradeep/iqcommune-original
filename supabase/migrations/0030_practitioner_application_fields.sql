-- 0030 — Practitioner application: tax ID, communication address, t-shirt size
-- New optional fields collected on the public empanelment form. Additive +
-- idempotent (zero-downtime: all nullable, no backfill needed).
--   pan_gst               — PAN, or GST number if applicable. Encrypted at rest
--                           (same AES-256-GCM "iv:tag:ct" text as bank fields).
--   communication_address — postal address for correspondence (PIN code included).
--   tshirt_size           — preferred t-shirt size (S/M/L/XL/XXL/XXXL).

ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS pan_gst               TEXT,
  ADD COLUMN IF NOT EXISTS communication_address TEXT,
  ADD COLUMN IF NOT EXISTS tshirt_size           TEXT;

-- Constrain t-shirt size to the known set when present (NULL always allowed).
-- Dropped-then-added so the migration is re-runnable.
ALTER TABLE practitioners
  DROP CONSTRAINT IF EXISTS practitioners_tshirt_size_check;
ALTER TABLE practitioners
  ADD CONSTRAINT practitioners_tshirt_size_check
  CHECK (tshirt_size IS NULL OR tshirt_size IN ('S', 'M', 'L', 'XL', 'XXL', 'XXXL'));
