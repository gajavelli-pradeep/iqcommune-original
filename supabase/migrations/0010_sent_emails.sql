-- Email idempotency table.
-- Prevents duplicate sends on retry / double-submit.

CREATE TABLE IF NOT EXISTS sent_emails (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  TEXT        UNIQUE NOT NULL,  -- sha256(email_type:entity_id)
  email_type       TEXT        NOT NULL,
  recipient_email  TEXT        NOT NULL,
  entity_id        TEXT        NOT NULL,
  brevo_message_id TEXT,
  status           TEXT        NOT NULL DEFAULT 'sent'
                   CHECK (status IN ('sent', 'failed', 'bounced')),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_sent_emails" ON sent_emails;
CREATE POLICY "admin_all_sent_emails"
  ON sent_emails FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
