-- Session and confirmation references.
--
-- Matching a request creates a session and its assignment, and both carry a
-- unique human-quotable reference (IQC-S0007, IQC-CONF-0012) that appears in
-- emails and on the consent page. 0008 introduced the sequence-backed generator
-- for practitioners and agreements; these are the same mechanism for the two
-- rows the match step creates.
--
-- A sequence rather than max()+1, for the same reason as 0008: two admins
-- matching at once would read the same max and one would hit the unique
-- constraint.

create sequence if not exists session_reference_seq      start 1;
create sequence if not exists confirmation_reference_seq start 1;

-- Start past anything already seeded so a generated value cannot collide.
select setval(
  'session_reference_seq',
  greatest(coalesce((select max(nullif(regexp_replace(reference, '\D', '', 'g'), '')::bigint) from sessions), 0), 1)
);
select setval(
  'confirmation_reference_seq',
  greatest(
    coalesce(
      (select max(nullif(regexp_replace(confirmation_reference, '\D', '', 'g'), '')::bigint)
       from session_practitioners),
      0
    ),
    1
  )
);

create or replace function next_reference(kind text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  case kind
    when 'practitioner' then return 'IQC-EMP-'  || lpad(nextval('practitioner_reference_seq')::text, 4, '0');
    when 'agreement'    then return 'IQC-AGR-'  || lpad(nextval('agreement_reference_seq')::text, 4, '0');
    when 'session'      then return 'IQC-S'     || lpad(nextval('session_reference_seq')::text, 4, '0');
    when 'confirmation' then return 'IQC-CONF-' || lpad(nextval('confirmation_reference_seq')::text, 4, '0');
    else raise exception 'unknown reference kind: %', kind;
  end case;
end $$;

revoke execute on function next_reference(text) from public, anon, authenticated;

-- A session's date is agreed after the match, so it cannot be NOT NULL at the
-- moment the match creates the row. The V7 flow confirms the date on the call
-- that follows; until then "no date yet" is the truth.
alter table sessions alter column session_date drop not null;
