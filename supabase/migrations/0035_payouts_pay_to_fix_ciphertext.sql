-- 0035_payouts_pay_to_fix_ciphertext.sql
-- Corrective: an earlier version of 0034 backfilled `pay_to` directly from the
-- practitioner's `upi_id` / `bank_account`, which are ENCRYPTED at rest
-- (AES-256-GCM, format "<iv_hex>:<tag_hex>:<ct_hex>" — see lib/encrypt.ts). That
-- copied ciphertext into `pay_to`, which the console would render verbatim.
--
-- Fix: NULL out any `pay_to` value in that encrypted format. A NULL `pay_to` means
-- "no override" — the console then derives the destination from the *decrypted*
-- practitioner fields on display, which is the correct, readable value. Admin
-- overrides (plaintext) never match the pattern, so they are preserved. Idempotent.
UPDATE payouts
SET pay_to = NULL
WHERE pay_to ~ '^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$';
