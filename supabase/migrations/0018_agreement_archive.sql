-- Keep the PDF the practitioner signed, instead of re-making one on download.
--
-- The download button rendered the document fresh from `constants/agreement.ts`
-- every time it was pressed. That was invisible while the contract text never
-- changed, and became a live problem the moment it did: the v2 delivery rewrote
-- the header, moved the platform into the preamble and changed clause 13, so a
-- download of an agreement signed before that change would have printed terms
-- its signer never saw — under their signature, with the platform's own
-- attestation that this is what was recorded.
--
-- A signed contract is an artefact, not a view. This stores the bytes at the
-- moment of signature and serves those bytes forever after; the renderer is only
-- consulted for agreements with no archive, which is every row signed before
-- this migration and every unsigned preview.
--
-- Idempotent: `add column if not exists`, and the bucket insert is guarded by
-- `on conflict do nothing`, so re-running changes nothing.

alter table public.practitioner_agreements
  add column if not exists signed_pdf_path text;

comment on column public.practitioner_agreements.signed_pdf_path is
  'Storage key of the PDF rendered at signature. Null on rows signed before this existed; those still re-render, and the document says so.';

-- Private, like session photos: a signed contract must never be reachable by
-- URL alone. The download route reads it with the service role and streams the
-- bytes itself, exactly as the photo download does.
insert into storage.buckets (id, name, public)
values ('agreements', 'agreements', false)
on conflict (id) do nothing;
