-- Stores the most recent password a Super Admin SET for an account (admin or
-- super_admin), so the SA can reveal/copy it to hand over — overwritten on each
-- change. The value is stored ENCRYPTED (AES-256-GCM; key derived from the app's
-- HMAC secret), never plaintext, so a bare DB dump alone cannot read it. This
-- intentionally holds recoverable credentials (per product requirement) —
-- SA-only, RLS-locked, and audited on read.
-- Idempotent and non-destructive — safe to re-run.

CREATE TABLE IF NOT EXISTS admin_credentials (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_cipher TEXT        NOT NULL,   -- format: ivHex:tagHex:ciphertextHex
  set_by          TEXT        NOT NULL,   -- Super Admin email that set it
  set_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service role (which bypasses RLS) ever touches this table.
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;
