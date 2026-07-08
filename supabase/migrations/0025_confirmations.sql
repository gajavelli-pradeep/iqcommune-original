-- 0025 — Session Consent: per-session revenue confirmations (Bucket C)
-- A confirmation is the revenue-share document a practitioner consents to before
-- a session is delivered. Admin generates it (gross + TDS% + GST% → net), which
-- produces a PDF (Supabase Storage) and an HMAC-signed consent link. The
-- practitioner opens the link, reviews, and consents; status flips to
-- 'Consent received' and the linked session's consent_status → 'Consent given'.
-- Net formula (V4 handoff §4.3): net = gross × (1 − tds% + gst%) — see lib/consent.ts.
-- Fully idempotent + re-runnable.

CREATE TABLE IF NOT EXISTS confirmations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code         TEXT UNIQUE NOT NULL,                 -- IQC-CNF-XXXXXX
  session_id       UUID NOT NULL REFERENCES sessions(id),
  practitioner_id  UUID NOT NULL REFERENCES practitioners(id),
  session_ref      TEXT NOT NULL,                        -- snapshot of the session ref_code
  gross_amount     INT NOT NULL,
  tds_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  net_amount       INT NOT NULL,
  snapshot         JSONB NOT NULL,                       -- every field shown on the PDF/consent page at generation time
  consent_link     TEXT,                                 -- the exact signed URL sent to the practitioner
  signed_at        TIMESTAMPTZ,
  signature_method TEXT CHECK (signature_method IN ('drawn','typed')),
  signature_data   TEXT,
  signer_ip        TEXT,
  storage_path     TEXT,                                 -- Storage path of the generated PDF
  status           TEXT NOT NULL DEFAULT 'Awaiting consent'
                   CHECK (status IN ('Awaiting consent','Consent received','Superseded')),
  issued_on        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ
);

-- Fast lookups by session (eligibility) and active-rows scans.
CREATE INDEX IF NOT EXISTS confirmations_session_idx ON confirmations(session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS confirmations_active_idx  ON confirmations(created_at DESC) WHERE deleted_at IS NULL;

-- At most one live (non-superseded, non-deleted) confirmation per session — the DB
-- guarantee behind eligibleSessionsForConfirmation().
CREATE UNIQUE INDEX IF NOT EXISTS confirmations_one_active_per_session
  ON confirmations(session_id)
  WHERE deleted_at IS NULL AND status <> 'Superseded';

-- Reuse the shared set_updated_at() trigger fn defined in 0001.
DROP TRIGGER IF EXISTS confirmations_updated_at ON confirmations;
CREATE TRIGGER confirmations_updated_at
  BEFORE UPDATE ON confirmations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Service-role only (all access goes through API routes; the public consent
-- submit uses the admin client after HMAC verification — no anon policy).
ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;

-- Extend the grace-window purge (from 0016) to cover confirmations: purge them
-- before their parent sessions so the FK is never tripped.
CREATE OR REPLACE FUNCTION purge_soft_deleted(retention INTERVAL DEFAULT INTERVAL '30 days')
RETURNS TABLE (table_name TEXT, purged BIGINT) LANGUAGE plpgsql AS $$
DECLARE
  cutoff TIMESTAMPTZ := NOW() - retention;
  n      BIGINT;
BEGIN
  DELETE FROM confirmations
   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'confirmations'; purged := n; RETURN NEXT;

  DELETE FROM payouts
   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'payouts'; purged := n; RETURN NEXT;

  DELETE FROM agreements
   WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'agreements'; purged := n; RETURN NEXT;

  DELETE FROM sessions s
   WHERE s.deleted_at IS NOT NULL AND s.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM payouts p       WHERE p.session_id = s.id)
     AND NOT EXISTS (SELECT 1 FROM confirmations c WHERE c.session_id = s.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'sessions'; purged := n; RETURN NEXT;

  DELETE FROM session_requests r
   WHERE r.deleted_at IS NOT NULL AND r.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.request_id = r.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'session_requests'; purged := n; RETURN NEXT;

  DELETE FROM practitioners p
   WHERE p.deleted_at IS NOT NULL AND p.deleted_at < cutoff
     AND NOT EXISTS (SELECT 1 FROM sessions         s   WHERE s.practitioner_id   = p.id)
     AND NOT EXISTS (SELECT 1 FROM agreements       a   WHERE a.practitioner_id   = p.id)
     AND NOT EXISTS (SELECT 1 FROM payouts          pay WHERE pay.practitioner_id = p.id)
     AND NOT EXISTS (SELECT 1 FROM confirmations    c   WHERE c.practitioner_id   = p.id)
     AND NOT EXISTS (SELECT 1 FROM session_requests r   WHERE r.assigned_to       = p.id);
  GET DIAGNOSTICS n = ROW_COUNT; table_name := 'practitioners'; purged := n; RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION purge_soft_deleted(INTERVAL) TO service_role;
