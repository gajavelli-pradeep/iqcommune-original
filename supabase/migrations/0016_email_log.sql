-- Every outbound email attempt, successful or not.
--
-- The system sends fifteen kinds of transactional mail and, until now, kept no
-- record of any of it. When a practitioner said an onboarding link never
-- arrived there was nothing to check: not whether it was attempted, not what
-- the provider said, not whether the address was even valid. Brevo's own
-- dashboard only knows about attempts that reached Brevo, which excludes every
-- interesting failure — missing config, an unsendable address, a timeout.
--
-- Written on every attempt, including dry runs, so the log tells the same story
-- in every environment.
create table if not exists public.email_log (
  id            uuid primary key default gen_random_uuid(),
  -- Ties a send back to the request that should have caused it.
  trace_id      text        not null,
  -- Slug from lib/email/templates.ts, e.g. 'practitioner-welcome'.
  template      text        not null,
  recipient     text        not null,
  stream        text        not null,
  -- One of the EmailStatus values in lib/email/outcome.ts.
  status        text        not null,
  ok            boolean     not null,
  error_code    text,
  error_message text,
  retry_count   integer     not null default 0,
  -- Brevo's id when it accepted the message. Acceptance is not delivery.
  provider_message_id text,
  created_at    timestamptz not null default now()
);

-- The duplicate check: "has this template gone to this address recently?".
-- Ordered so the newest row for a pair is the first one read.
create index if not exists email_log_dedupe_idx
  on public.email_log (template, recipient, created_at desc);

-- The support question — "what happened to this person's mail?".
create index if not exists email_log_recipient_idx
  on public.email_log (recipient, created_at desc);

-- The operations question — "what is failing right now?".
create index if not exists email_log_failures_idx
  on public.email_log (created_at desc)
  where ok = false;

-- Service-role only. Nothing in the browser reads this: it holds every address
-- the system has ever mailed, and the console reaches it through a server
-- action that has already checked the caller.
alter table public.email_log enable row level security;
