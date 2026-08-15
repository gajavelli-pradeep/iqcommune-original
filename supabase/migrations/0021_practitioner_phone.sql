-- The practitioner's phone number, carried onto the practitioner record.
--
-- Every applicant gives one: `practitioner_applications.phone` is NOT NULL and
-- the apply form has always collected it. What it never did was travel — when
-- an application becomes a practitioner, the insert carries name, role, city,
-- state and email, and leaves the number behind. So the console could show a
-- practitioner's email everywhere and their number nowhere, and the WhatsApp
-- half of the draft dialog had no one to send to.
--
-- Exactly the case `state` was in one migration ago (0017), whose comment reads
-- "carried onto the practitioner rather than left on the application", and this
-- follows it rather than inventing a second way to reach the same value. A
-- practitioner created without an application — there is nothing preventing one
-- — has no application to read through at all, which is the other half of why
-- the value belongs here.
--
-- Nullable, not NOT NULL: the backfill below can only reach practitioners whose
-- application still exists, and a column that rejects the rest would fail on
-- the way in. Null means "no number on file", which the dialog reads as "offer
-- no WhatsApp button" rather than opening the app on nothing.
--
-- Idempotent: `add column if not exists`, and the backfill only writes rows
-- where the column is still null, so re-running changes nothing and never
-- overwrites a number an admin has since corrected.

alter table public.practitioners
  add column if not exists phone text;

update public.practitioners as p
set phone = a.phone
from public.practitioner_applications as a
where p.application_id = a.id
  and p.phone is null
  and a.phone is not null;

comment on column public.practitioners.phone is
  'Contact number as given on the application. Null where the practitioner predates this column and their application is gone, or where they were created without one.';
