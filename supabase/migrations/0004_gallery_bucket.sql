-- Gallery storage bucket (audit H1).
--
-- services/gallery.ts serves published marketing photos via getPublicUrl, which
-- only works on a PUBLIC bucket. 0003 provisioned session-photos but never the
-- gallery bucket, so a fresh environment 500s on the first gallery read and the
-- public URLs 404 — the exact "works where someone ran a script, breaks in prod"
-- failure 0003 exists to prevent.
--
-- Public by necessity. Only PUBLISHED objects may ever be written here (audit
-- M4): the row-level `published` flag has no storage-level teeth, so an
-- unpublished draft placed in a public bucket is world-readable by path. The
-- (not-yet-built) admin gallery upload panel must uphold that; if drafts ever
-- need staging, switch this to a private bucket + short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- L4: 0003's ON CONFLICT omitted the `public` flag, so a re-run could not undo a
-- dashboard flip of session-photos to public. Re-assert it here — session photos
-- are private and served only through signed URLs.
update storage.buckets set public = false where id = 'session-photos';
