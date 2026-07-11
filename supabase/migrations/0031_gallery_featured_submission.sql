-- 0031 — Link a gallery photo back to the session photo-submission it was
-- "featured" from, so the Session Photos → "Feature in gallery" toggle can add a
-- submission's photos to the public gallery as a set and later remove them again.
-- Nullable: gallery photos uploaded directly via GalleryManager have no source.
-- Idempotent + re-runnable.

ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS source_submission_id UUID
    REFERENCES photo_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gallery_photos_source_submission_idx
  ON gallery_photos (source_submission_id)
  WHERE source_submission_id IS NOT NULL;
