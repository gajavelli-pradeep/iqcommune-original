-- 0029 — Session requests: New / Confirmed / Cancelled (V4 §4.2).
-- V4 dropped "Matched" (matching happens offline; the system records the outcome
-- via one-click Assign) and never had "Completed" for requests. Keep "Cancelled".
-- Re-point any existing rows, then tighten the CHECK. Idempotent + re-runnable.

UPDATE session_requests SET status = 'New'       WHERE status = 'Matched';
UPDATE session_requests SET status = 'Confirmed' WHERE status = 'Completed';

ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;
ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('New', 'Confirmed', 'Cancelled'));
