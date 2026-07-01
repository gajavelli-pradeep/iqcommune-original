-- 0017 — Admin-curated "Sessions in the room" gallery
-- Photos shown in the public GallerySection. Admins upload images to the public
-- `gallery` storage bucket and set two overlay captions (top-left + bottom-right).
-- Fully idempotent + re-runnable.

CREATE TABLE IF NOT EXISTS gallery_photos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path         TEXT        NOT NULL,
  caption_top_left     TEXT,                       -- the gold pill (e.g. topic / module)
  caption_bottom_right TEXT,                       -- e.g. city
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  published            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public homepage reads published photos in display order.
CREATE INDEX IF NOT EXISTS gallery_photos_published_idx
  ON gallery_photos (sort_order, created_at) WHERE published = TRUE;

-- touch_updated_at() exists from the v2 schema.
CREATE OR REPLACE TRIGGER trg_gallery_photos_updated_at
  BEFORE UPDATE ON gallery_photos
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- Anon may read only published rows (defense-in-depth; the app also reads via the
-- service role). Writes are service-role only (admin API routes).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename = 'gallery_photos' AND policyname = 'anon read published gallery'
  ) THEN
    CREATE POLICY "anon read published gallery"
      ON gallery_photos FOR SELECT TO anon USING (published = TRUE);
  END IF;
END $$;
