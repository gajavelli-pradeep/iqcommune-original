-- Reusable email attachments (V8 welcome flyers + admin uploads).
--
-- One row per saved file; the bytes live in the private `email-attachments`
-- bucket and are read with the service role at send time (Brevo gets base64,
-- never a URL). Additive and idempotent: 0001-0021 are untouched.
--
-- Deletes are soft (deleted_at) so a mistaken delete is recoverable by SQL.
-- uploaded_by_email is null for the seeded flyers: only a global admin may
-- delete those. default_for_welcome marks the files the welcome email
-- attaches automatically (the practitioner's signed agreement is added in
-- code, not stored here).

create table if not exists public.email_attachments (
  id                  uuid primary key default gen_random_uuid(),
  label               text not null,
  file_name           text not null,
  storage_path        text not null unique,
  content_type        text not null check (content_type in ('application/pdf', 'image/png', 'image/jpeg')),
  size_bytes          integer not null check (size_bytes > 0),
  uploaded_by_email   text,
  default_for_welcome boolean not null default false,
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index if not exists email_attachments_live_idx
  on public.email_attachments (created_at) where deleted_at is null;

alter table public.email_attachments enable row level security;

insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', false)
on conflict (id) do nothing;
