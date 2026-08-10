# Supabase keepalive

Supabase pauses a free-tier project after ~7 days with no database activity.
A paused database means every page 500s until someone restores it by hand. This
keeps the meter moving with one trivial query a few times a day.

## Decision

A route that runs a real query, called by Vercel Cron. Two daily entries rather
than one.

**It must be a route that queries Postgres, not a ping of the homepage.** `/` is
statically prerendered and served from Vercel's CDN, so pinging it never reaches
Supabase — Vercel shows traffic, Supabase shows none, project pauses anyway.

**Two entries, not one.** Vercel Hobby caps each cron job at once per day but
allows many jobs, so two entries twelve hours apart are legal and give 14 pings
a week instead of 7. One failed night then leaves a 12-hour gap, not 48. If the
platform rejects the second entry at deploy time, deleting it is a one-line fix
— a loud failure, not a silent one.

Vercel sends `Authorization: Bearer $CRON_SECRET` to cron paths automatically
when that variable is set, so the endpoint is closed to everyone else.

## `CRON_SECRET` — the conflict this has to resolve

`docs/ENVIRONMENT.md` lists this variable under **Deliberately absent**:

> V6 ran three daily Vercel crons that permanently delete rows and storage
> objects… None is rebuilt here until a restore has been tested from a real
> backup — BUILD-PLAN §6 H4 and ADR 0003. Adding this variable is how those
> crons come back; do not add it casually.

That warning is about *destructive* crons. This one only reads. The variable is
added, and that doc section is rewritten to say what it now guards and that its
presence is **not** permission to rebuild the purge jobs — otherwise the next
person reads "CRON_SECRET exists" as the gate having been cleared.

## Fail closed, and loudly

- No `CRON_SECRET` set → the route refuses and logs an error naming the
  variable. An open keepalive endpoint is a free loop for anyone who finds it.
- Wrong or missing header → 401.
- Query fails → 500 with the error logged.
- Success → logged too, so the Vercel log shows the thing is alive.

The known weakness of any keepalive is that it dies quietly. Logging both
outcomes is the cheapest thing that makes the failure visible.

## What it queries

`gallery_photos`, `select id limit 1`. The least sensitive table in the schema —
published photos, no personal data — and one row at most. An empty table is
fine: the query still reaches Postgres, which is the entire point.

## Lanes

| File | Change |
|---|---|
| `app/api/keepalive/route.ts` | new — auth gate, one query, logged outcomes |
| `vercel.json` | `crons` block, two daily entries |
| `lib/env.ts` | register `CRON_SECRET` (already in `.env.example`) |
| `docs/ENVIRONMENT.md` | rewrite the "Deliberately absent" note |
| `tests/unit/keepalive.test.ts` | the auth gate and both failure paths |

Nothing else is touched. No existing route, template, or component changes.

## Honest limits

- This is a workaround. Supabase decides what counts as activity and can change
  the rule; it is not a contract.
- It does nothing about the free tier's real risk: **no backups**. Keeping a
  backup-less database awake is not the same as making it safe.
- If real users depend on the site, Supabase Pro removes pausing *and* adds
  daily backups, which is the failure that would actually hurt.
