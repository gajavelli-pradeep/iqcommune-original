-- Ratings an admin recorded from a verbal report (V7 tab 5).
--
-- The Session Details tab lets a Global Admin key in a rating the requestor
-- gave on the phone ("Got it verbally? — Record manually"). Stored, that rating
-- is indistinguishable from one the requestor submitted themselves through the
-- rating link — and they are not the same evidence. A practitioner's average is
-- built from these, so the difference matters.
--
-- `recorded_by` holds the admin who keyed it in; null means the requestor
-- submitted it directly. Nullable and additive, so every existing rating keeps
-- its meaning without a backfill.

alter table session_ratings
  add column if not exists recorded_by text;

comment on column session_ratings.recorded_by is
  'Admin who recorded this rating from a verbal report. NULL = submitted by the requestor through the rating link.';
