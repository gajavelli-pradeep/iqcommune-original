-- Session-request assignment (V7 tab 3).
--
-- The V7 console captures three things on a request that this schema had
-- nowhere to put: which practitioner agreed to it, the gross payout agreed with
-- them, and the minimum number of participants the client committed to.
--
-- They belong on the REQUEST, not on the session, because V7 records them while
-- the request is still 'New' — they are the terms agreed on the phone, before
-- anything is matched. Matching is what turns them into a session and an
-- assignment; until then they are intent, and intent with no home is why this
-- panel could not be cloned.
--
-- Additive and idempotent. Nothing is backfilled: a request that predates this
-- genuinely has no agreed terms, and inventing one would be worse than null.

alter table session_requests
  add column if not exists assigned_practitioner_id uuid references practitioners (id),
  -- Numeric, not text: it is money, and it is copied into
  -- session_practitioners.gross_payout on match.
  add column if not exists agreed_gross_payout numeric(12, 2),
  -- The floor the client commits to, which is not the same as `group_size` —
  -- that is the expected range ("16–25"), this is what they guarantee.
  add column if not exists min_commitment integer;

do $$ begin
  alter table session_requests
    add constraint agreed_gross_payout_nonneg check (agreed_gross_payout >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table session_requests
    add constraint min_commitment_positive check (min_commitment > 0);
exception when duplicate_object then null; end $$;

-- The panel groups by assignee and the Session Details tab joins back through
-- it; without this both seq-scan once the table grows.
create index if not exists session_requests_assignee_idx
  on session_requests (assigned_practitioner_id)
  where deleted_at is null;
