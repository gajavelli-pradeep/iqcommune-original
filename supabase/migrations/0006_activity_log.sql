-- Activity log (audit M9).
--
-- The operating procedure mandates an audit trail with 90-day retention. The
-- capability already ships (the console has an Activity tab, global-admin only),
-- but there was no table behind it. Additive and idempotent.
--
-- Retention is NOT enforced by a cron here: V6's purge crons are deliberately
-- absent until a restore is proven from backup (ENVIRONMENT.md, ADR-0003). The
-- 90-day prune is reintroduced with those, not before.

create table if not exists activity_log (
  id           uuid primary key default gen_random_uuid(),
  -- Who acted. Email rather than a user FK: the actor may be a system process
  -- (an automatic status transition) with no console account.
  actor_email  text,
  -- What happened, e.g. "practitioner.empanelled", "session.matched".
  action       text not null,
  -- The record it concerns, for filtering — type + human reference, not a FK,
  -- so the log survives the row it describes being hard-deleted.
  entity_type  text,
  entity_ref   text,
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_recent_idx on activity_log (created_at desc);
create index if not exists activity_log_entity_idx on activity_log (entity_type, entity_ref);

-- Deny-by-default like every other table: read only through the service-role
-- client behind the global-admin console route.
alter table activity_log enable row level security;
