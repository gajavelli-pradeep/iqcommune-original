-- Gallery drafts (V7 tab 8).
--
-- V7's gallery is two stages: photos are uploaded into a DRAFT area, given a
-- city and a caption there, and only then published to the landing page. The
-- `published` flag already models the two stages, but `caption` and `city` were
-- NOT NULL — so a draft could not exist before someone had typed both, which is
-- the opposite of the order the tab works in.
--
-- Nullable here, and required at PUBLISH time instead (enforced in the publish
-- action): the constraint belongs where the promise is made, which is when a
-- photo goes live on a public page, not when it is dropped into a staging area.

alter table gallery_photos alter column caption drop not null;
alter table gallery_photos alter column city    drop not null;

-- A published photo must carry both, since the landing page renders them.
do $$ begin
  alter table gallery_photos
    add constraint published_photos_are_captioned
    check (
      not published
      or (caption is not null and length(btrim(caption)) > 0
          and city is not null and length(btrim(city)) > 0)
    );
exception when duplicate_object then null; end $$;

-- The tab reads drafts and live photos as two separate lists.
create index if not exists gallery_photos_stage_idx
  on gallery_photos (published, created_at desc)
  where deleted_at is null;
