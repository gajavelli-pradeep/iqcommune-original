-- Admin invitation ("summon") flow.
-- A Super Admin generates a single-use, expiring invite for a specific email;
-- the invitee opens /join-admin, sets their own password, and their `admin`
-- account is created. Only the SHA-256 hash of the token is stored — the raw
-- token lives only in the shared URL, so a DB leak yields no usable invites.
-- Idempotent and non-destructive — safe to re-run.

CREATE TABLE IF NOT EXISTS admin_invites (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  role            TEXT        NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  token_hash      TEXT        NOT NULL UNIQUE,
  status          TEXT        NOT NULL DEFAULT 'Pending'
                              CHECK (status IN ('Pending', 'Accepted', 'Revoked', 'Expired')),
  invited_by      TEXT        NOT NULL,          -- SA email that generated the invite
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_user_id UUID                           -- auth.users id created on accept
);

-- At most one live (Pending) invite per email address.
CREATE UNIQUE INDEX IF NOT EXISTS admin_invites_active_email_idx
  ON admin_invites (LOWER(email))
  WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS admin_invites_status_idx     ON admin_invites (status);
CREATE INDEX IF NOT EXISTS admin_invites_created_at_idx ON admin_invites (created_at DESC);

-- Lock the table down: only the service role (which bypasses RLS) touches it.
-- RLS ON with no policies = anon/authenticated keys are denied all access,
-- protecting the invite token hashes and emails. The app is unaffected.
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;
