-- 0032_practitioner_reversibility.sql
-- V5 P1-3: reversibility for the practitioner lifecycle (Danger Zone §3/§5).
-- Purely additive & safe: widens an existing CHECK (no existing row can violate a
-- wider allowed set) and adds two nullable columns. Fully reversible.

-- 1. Allow the 'Deactivated' status. 0001_schema.sql shipped six statuses; this
--    swaps the CHECK for a superset so Deactivate/Reactivate can persist.
ALTER TABLE practitioners DROP CONSTRAINT IF EXISTS practitioners_status_check;
ALTER TABLE practitioners ADD CONSTRAINT practitioners_status_check
  CHECK (status IN (
    'Applied',
    'Under Review',
    'Screening Done',
    'Agreement Sent',
    'Empanelled',
    'Rejected',
    'Deactivated'
  ));

-- 2. Remember the status to restore:
--    prev_active_status → the status held when active, restored on Reactivate.
--    prev_status        → the status before a one-way Empanel/Reject, restored on Revert.
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS prev_active_status TEXT;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS prev_status TEXT;
