-- v2 made org, group_size, min_commit, and preferred_dates optional on
-- session_requests, but migration 0001 declared them NOT NULL. Every INSERT
-- from the v2 public form omits org (inserts org_name instead) and may omit
-- the others for non-Group audiences. Without this migration, all public form
-- submissions fail with a NOT NULL constraint violation.

ALTER TABLE session_requests ALTER COLUMN org            DROP NOT NULL;
ALTER TABLE session_requests ALTER COLUMN group_size     DROP NOT NULL;
ALTER TABLE session_requests ALTER COLUMN min_commit     DROP NOT NULL;
ALTER TABLE session_requests ALTER COLUMN preferred_dates DROP NOT NULL;
