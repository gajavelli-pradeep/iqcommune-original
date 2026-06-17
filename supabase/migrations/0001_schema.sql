-- iqcommune database schema

-- PRACTITIONERS
CREATE TABLE practitioners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL,
  org             TEXT,
  city            TEXT NOT NULL,
  experience      TEXT NOT NULL,
  modules         TEXT[] NOT NULL DEFAULT '{}',
  teach_freq      TEXT,
  why             TEXT,
  upi_id          TEXT,
  bank_name       TEXT,
  bank_account    TEXT,
  ifsc            TEXT,
  pay_to_family   BOOLEAN DEFAULT FALSE,
  family_name     TEXT,
  family_relation TEXT,
  family_upi      TEXT,
  family_bank     TEXT,
  family_ifsc     TEXT,
  status          TEXT NOT NULL DEFAULT 'Applied'
                  CHECK (status IN ('Applied','Under Review','Screening Done','Agreement Sent','Empanelled','Rejected')),
  ref_code        TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SESSION REQUESTS
CREATE TABLE session_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  org             TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  topic           TEXT NOT NULL,
  audience_type   TEXT NOT NULL,
  group_size      TEXT NOT NULL,
  min_commit      INT NOT NULL,
  venue           TEXT,
  preferred_dates TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'New'
                  CHECK (status IN ('New','Matched','Confirmed','Completed')),
  assigned_to     UUID REFERENCES practitioners(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SESSIONS
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code        TEXT UNIQUE NOT NULL,
  module          TEXT NOT NULL,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  session_date    DATE NOT NULL,
  start_time      TEXT NOT NULL,
  end_time        TEXT NOT NULL,
  venue           TEXT NOT NULL,
  audience_type   TEXT NOT NULL,
  participants    INT NOT NULL,
  payout_amount   INT NOT NULL,
  tds_applicable  BOOLEAN DEFAULT FALSE,
  tds_rate        NUMERIC(4,2),
  consent_status  TEXT NOT NULL DEFAULT 'Pending consent'
                  CHECK (consent_status IN ('Pending consent','Consent given')),
  status          TEXT NOT NULL DEFAULT 'Upcoming'
                  CHECK (status IN ('Upcoming','Completed','Cancelled')),
  request_id      UUID REFERENCES session_requests(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AGREEMENTS
CREATE TABLE agreements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id  UUID NOT NULL REFERENCES practitioners(id),
  ref_code         TEXT UNIQUE NOT NULL,
  module           TEXT NOT NULL,
  signed_at        TIMESTAMPTZ,
  signature_method TEXT CHECK (signature_method IN ('drawn','typed')),
  signature_data   TEXT,
  signer_ip        TEXT,
  status           TEXT NOT NULL DEFAULT 'Pending signature'
                   CHECK (status IN ('Pending signature','Active')),
  storage_path     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PAYOUTS
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  invoice_ref     TEXT UNIQUE NOT NULL,
  gross_amount    INT NOT NULL,
  net_amount      INT NOT NULL,
  payment_method  TEXT,
  paid_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending','Paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on practitioners
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

CREATE TRIGGER practitioners_updated_at
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE practitioners    ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts           ENABLE ROW LEVEL SECURITY;

-- Anon key: only insert on public-facing tables
CREATE POLICY "anon insert practitioners"
  ON practitioners FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert session_requests"
  ON session_requests FOR INSERT TO anon WITH CHECK (true);

-- All read/update operations use service role (API routes)
