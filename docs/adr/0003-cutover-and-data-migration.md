# ADR 0003 — Cutover: share the live Supabase project, migrate no data

**Date:** 2026-07-21 · **Status:** Proposed — one confirmation needed, see Open question
**Decision owner:** project owner

## Context

The stop condition's `Live` rung had no plan behind it. This ADR is that plan. Facts below come
from a read-only audit of the running V6 app, not from assumption.

**What is live today**

- Vercel project `iqcommune` (`prj_sk8N3OYXFo8IbFOAma4TjeLfpTsM`), deployed from git. No CI — no
  `.github/` exists in V6, so nothing gates a deploy today.
- One Supabase project: 15 tables, 39 migrations, four storage buckets — `session-photos`,
  `gallery`, `agreements`, `confirmations`. The last two hold **signed legal PDFs**.
- Brevo for all outbound email, with an inbound webhook registered against the V6 host and
  authenticated by a query-string secret.
- Upstash Redis for rate limiting.
- Authorization is application-layer, not RLS: API routes use the service-role key, which bypasses
  RLS entirely. Roles live in `auth.users.app_metadata`, not in a table.

**Three facts that constrain everything**

1. **Three daily Vercel crons permanently delete data.** `purge_soft_deleted` hard-deletes
   practitioners, sessions, agreements, payouts and confirmations soft-deleted more than 30 days
   ago. `prune_activity_log` hard-deletes audit rows older than 90 days. `expire-photos` deletes
   storage objects outright. They are authenticated only by `CRON_SECRET`.
2. **There is no backup or export tooling in the repo.** `scripts/` contains provisioning and
   test-data helpers only. Nothing has ever exported this database.
3. **The migration chain does not reproduce the live schema.** `onboarding_tokens` exists in the
   generated types with no migration behind it. Replaying 39 migrations into an empty project
   therefore produces a database that is *not* the one running in production. Also carried outside
   the chain: the `next_practitioner_ref()` sequence position (wrong offset → colliding ref codes),
   `admin_credentials` rows encrypted under `ENCRYPTION_KEY` (lost key → unrecoverable), and
   `sent_emails`, the idempotency ledger whose absence causes **re-sending email V6 already sent**.

## Decision

**V7 deploys as a new Vercel project pointed at the *existing* Supabase project. No data is
migrated, because no data moves.**

Cutover is then a DNS/domain switch between two Vercel projects reading one database — and rollback
is switching it back.

**The schema change V7 needs — dropping payment and tax columns — is not performed at cutover.**
V7 simply stops reading those columns. They are removed only after V6 is retired, as a separate
expand→contract migration. Nothing is dropped while a rollback target still depends on it.

## Alternatives considered

**New Supabase project + full data migration.** The clean-slate option, and the one that would let
V7 own its schema from day one. **Rejected:** it converts every constraint above into a live risk
inside a two-day window — a schema the migration chain cannot reproduce, four buckets of legal PDFs
to copy, an auth-user table whose role claims live in `app_metadata`, a sequence that silently
corrupts ref codes if misaligned, and an encryption key that makes stored credentials
unrecoverable if mishandled. There is no export tooling to do any of it and no rehearsal time.
The payoff — a tidier schema — is not worth it this week.

**Deploy V7 over the existing Vercel project.** Rejected: it destroys the rollback path. Two
projects on one database means reverting is a domain change taking seconds.

## Consequences

**Accepted:**

- **V6 and V7 read and write the same tables during overlap.** Both must stay schema-compatible for
  as long as V6 exists. This is the price of an instant rollback, and it is worth paying.
- **V6's crons must be disabled before cutover, at the V6 project.** They fire against the shared
  database; a live V7 does not stop them. Removing the `crons` block from V6's `vercel.json` and
  redeploying is the mechanism.
- Shared Upstash rate-limit buckets across both apps during overlap. Harmless — worst case a user
  is limited slightly sooner.
- V7 inherits V6's untidy schema, including the payment/tax columns it will not read.

**Gained:**

- Zero risk of losing a signed agreement, a confirmation PDF, or an audit trail at cutover, because
  nothing is copied.
- Rollback is a domain switch, not a restore.
- `sent_emails` continues uninterrupted, so no duplicate email.

## Cutover runbook

Ordered. Steps 1–3 happen before anything user-visible changes.

1. **Prove a restore.** Take a Supabase backup, restore it into a scratch project, confirm row
   counts and that one `agreements` PDF opens. Until this passes, nothing else on this list runs —
   BUILD-PLAN §6 H4.
2. **Disable V6's three crons** — remove `crons` from V6's `vercel.json`, redeploy V6. Verify no
   cron is listed in the Vercel dashboard.
3. **Create the V7 Vercel project**, set env vars per `docs/ENVIRONMENT.md` pointing at the
   production Supabase project, deploy to a preview URL, smoke-test every route against real data.
4. **Port the redirects.** V6 serves `/admin → /console`, `/admin/:path* → /console/:path*` (both
   permanent, so browser-cached), plus `/super-login → /global-login`, `/console/global* →
   /globaladmin*`, `/console/super* → /globaladmin*`. Missing these 404s existing bookmarks.
5. **Port the security headers and CSP** from V6's `next.config.ts` — HSTS, `X-Frame-Options:
   DENY`, nosniff, Referrer-Policy, Permissions-Policy, and a CSP whose `connect-src` and `img-src`
   allow `*.supabase.co`. A different image host silently breaks under the copied CSP.
6. **Repoint the domain** from the V6 Vercel project to V7.
7. **Re-register the Brevo webhook** against the V7 host with the same secret. Until this is done,
   delivery and bounce status stops updating — silently.
8. **Watch**, then retire V6 only after a clean period. Retirement, not cutover, is when the
   payment/tax columns get dropped.

**Rollback:** repoint the domain to the V6 project. Valid at every step because no destructive
schema change has been made. This property is the reason for the whole design and must not be
traded away for tidiness.

## Open question — needs the owner

**Which domain does V7 go live on, and is it owned?** Nothing in either repo configures a domain;
V6's canonical host comes from `NEXT_PUBLIC_BASE_URL` and its e2e tests default to an
`@iqcommune.in` address. Step 6 is unschedulable until this is confirmed, and if the brand domain
is not owned, "live" means a Vercel-provided host and the client should be told so before Thursday,
not after.

## Follow-through

1. Step 1 (proven restore) is a hard gate on every other step.
2. No `CRON_SECRET` in V7 and no destructive cron rebuilt until step 1 has passed —
   `docs/ENVIRONMENT.md` records this.
3. Keep V7 schema-compatible with V6 until V6 is retired.
4. Revisit this ADR at retirement to plan the expand→contract removal of the payment/tax columns.
