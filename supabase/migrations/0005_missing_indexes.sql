-- FK index on session_requests.assigned_to (practitioners.id).
-- Missing from 0003 — joins on this column do a seq scan without it.
CREATE INDEX IF NOT EXISTS session_requests_assigned_to_idx
  ON session_requests(assigned_to);

-- Admin console orders practitioners by created_at DESC — this index is used.
CREATE INDEX IF NOT EXISTS practitioners_created_at_idx
  ON practitioners(created_at DESC);

CREATE INDEX IF NOT EXISTS session_requests_open_idx
  ON session_requests(created_at DESC)
  WHERE status = 'New';

CREATE INDEX IF NOT EXISTS payouts_pending_idx
  ON payouts(created_at DESC)
  WHERE status = 'Pending';
