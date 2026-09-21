-- Small key/value settings a global admin can change from the console.
--
-- First use: `landing.gallery_visible` — whether the home page shows the
-- "Sessions in the room" gallery. A missing row means "visible", so this table
-- can be empty (or absent, until applied) without changing the site.
-- Additive and idempotent; read/written only with the service role.

create table if not exists public.app_settings (
  key               text primary key,
  value             jsonb not null,
  updated_by_email  text,
  updated_at        timestamptz not null default now()
);

-- Drift repair: a table of this name may already exist without these columns
-- (`create table if not exists` skips it), and the console then fails to save
-- with "Could not find the 'updated_by_email' column ... in the schema cache".
alter table public.app_settings
  add column if not exists value            jsonb,
  add column if not exists updated_by_email text,
  add column if not exists updated_at       timestamptz not null default now();

alter table public.app_settings enable row level security;

-- Let the API notice the change now rather than on its next refresh.
notify pgrst, 'reload schema';
