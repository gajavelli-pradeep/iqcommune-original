-- 0018 — Generic platform settings (key/value) + the gallery-admin-access flag
-- Runtime-toggleable settings the Super Admin controls. First use: whether
-- regular admins may manage the homepage Gallery. Fully idempotent.

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default: admins may manage the gallery (preserves current behaviour). SA can flip it off.
INSERT INTO app_settings (key, value)
VALUES ('gallery_admin_access', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- touch_updated_at() exists from the v2 schema.
CREATE OR REPLACE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Service-role only (admin API). No anon/authenticated policies.
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
