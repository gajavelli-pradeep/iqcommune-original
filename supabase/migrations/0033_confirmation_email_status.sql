-- 0033 — Confirmation email delivery status
-- Until now the consent email was best-effort and its outcome was swallowed: the
-- admin console showed a generated confirmation with no signal whether Brevo
-- actually accepted (let alone delivered) the email. This adds a per-confirmation
-- status so a failed send surfaces a warning + Resend action, and so the Brevo
-- delivery webhook can later mark delivered/bounced. Additive + idempotent.
--
--   not_sent  — default; historical/seed rows we have no delivery signal for
--   no_email  — practitioner has no email on file (nothing to send)
--   sent      — accepted by Brevo (our API call returned 2xx)
--   delivered — Brevo webhook confirmed inbox delivery
--   failed    — send threw (Brevo rejected / network / timeout)
--   bounced   — Brevo webhook reported hard/soft bounce, block, or spam

ALTER TABLE confirmations
  ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'not_sent'
    CHECK (email_status IN ('not_sent','no_email','sent','delivered','failed','bounced')),
  ADD COLUMN IF NOT EXISTS email_last_attempt_at TIMESTAMPTZ;

-- Historical rows keep 'not_sent' — asserting 'sent' would be a lie, since those
-- pre-date send tracking (and seed rows never ran the send pipeline at all).
