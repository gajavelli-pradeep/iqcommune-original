-- Private storage for session photos — F3.
--
-- Created as a migration rather than by hand in the dashboard so a fresh
-- environment gets it too: the previous system provisioned buckets with ad-hoc
-- scripts, and a bucket that exists only where someone remembered to run one is
-- how an upload works in dev and 500s in production.
--
-- Private, and constrained at the bucket as well as in the route. The route's
-- check is the one that produces a good error message; this one is the check
-- that still holds if a future caller forgets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-photos', 'session-photos', false, 26214400, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage policies: every read and write goes through a server route holding
-- the service-role key, which bypasses them. Adding an anon policy here would
-- route around the token check that decides whose session a photo belongs to.
