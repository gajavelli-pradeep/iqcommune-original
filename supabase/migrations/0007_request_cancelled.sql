-- Align session_requests.status CHECK with the API route, which already accepts
-- 'Cancelled' (app/api/admin/session-requests/route.ts). Without this, setting a
-- request to "Cancelled" raises Postgres 23514 and the admin toast shows a failure.
ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;
ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('New', 'Matched', 'Confirmed', 'Completed', 'Cancelled'));
