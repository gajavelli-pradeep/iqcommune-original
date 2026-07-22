-- Link practitioners to the applications they came from.
--
-- `practitioners.application_id` has existed since 0002 but nothing populated
-- it: rows seeded before the console could promote an application have it null.
-- The console's pipeline read papers over that by matching on email, but every
-- WRITE that has to walk a practitioner back a stage — clearing a signature
-- captured in error, for one — needs the real link, and a read-side fallback
-- does not give it one.
--
-- Matching on lowercased email is the same identity the rest of the schema
-- already keys on (both tables carry a `lower(email)` index for it).
--
-- Idempotent and conservative: it fills only rows that are null, and only where
-- exactly ONE live application matches. An ambiguous email is left alone rather
-- than linked to a guess.

update practitioners p
set    application_id = matched.id
from (
  select a.id, lower(a.email) as email
  from   practitioner_applications a
  where  a.deleted_at is null
  group  by a.id, lower(a.email)
) matched
where p.application_id is null
  and p.deleted_at is null
  and lower(p.email) = matched.email
  and (
    select count(*)
    from   practitioner_applications a2
    where  a2.deleted_at is null
      and  lower(a2.email) = lower(p.email)
  ) = 1;

-- An application whose practitioner is already empanelled has ended; leaving it
-- at an earlier stage makes the two records disagree about the same event. The
-- console resolves that disagreement in the practitioner's favour when it
-- reads, but a read-time reconciliation is not a reason to store the wrong
-- value — the next writer would trust it.
update practitioner_applications a
set    status = 'Empanelled'
from   practitioners p
where  p.application_id = a.id
  and  p.deleted_at is null
  and  a.deleted_at is null
  and  p.status in ('Empanelled', 'Deactivated')
  and  a.status <> 'Empanelled';
