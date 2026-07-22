-- V7 status vocabulary (audit H2) — EXPAND phase only.
--
-- The status enums predate the CA-redesign workflow. This adds the values the
-- V7 operating procedure's automatic transitions need. It is expand-only and
-- safe: `ADD VALUE IF NOT EXISTS` is additive, touches no existing row, and
-- removes nothing. The BACKFILL of live rows onto the new vocabulary (e.g.
-- retiring 'Scheduled' in favour of 'Confirmed') is a separate migration and a
-- CLIENT DECISION before cutover — it is deliberately NOT done here.
--
-- Note: a value added by ALTER TYPE ... ADD VALUE cannot be used in the same
-- transaction that adds it. These run before any code references them, so that
-- restriction does not apply at runtime.

-- Session requests: New → Matched → (Scheduled) → Cancelled. 'Matched' is the
-- trigger step 8 keys the automatic session-record creation on.
alter type session_request_status add value if not exists 'Matched';

-- Practitioner applications: Applied → Screening Done → Agreement Sent →
-- Empanelled / Rejected.
alter type practitioner_application_status add value if not exists 'Applied';
alter type practitioner_application_status add value if not exists 'Screening Done';
alter type practitioner_application_status add value if not exists 'Agreement Sent';
alter type practitioner_application_status add value if not exists 'Rejected';

-- Sessions: Pending → Confirmed → Completed (with Cancelled throughout). Step 13
-- filters on 'Confirmed'; step 15→17 gates the rating link on 'Completed'.
alter type session_status add value if not exists 'Pending';
alter type session_status add value if not exists 'Confirmed';
alter type session_status add value if not exists 'Completed';
