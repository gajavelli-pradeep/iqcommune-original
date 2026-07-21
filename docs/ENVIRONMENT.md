# Environment contract

`lib/env.ts` is the single source of truth. This file explains it; the code enforces it.

`.env*` is gitignored in full — **no `.env.example` is committed**, deliberately: this repo has no
secret-scanning gate in CI yet, and a committed template is the usual way a real key reaches a
public history. Copy the block below into `.env.local` by hand.

## Two tiers

| Tier | Meaning | Enforcement |
|---|---|---|
| **REQUIRED** | the app cannot serve a request without it | `validateEnv()` throws at boot, listing every problem at once |
| **FEATURE** | needed only by a capability not built yet | `requireEnv(key)` throws at the call site, naming the feature |

A FEATURE variable is promoted to REQUIRED **in the same change that ships the feature needing
it** — never later, or the failure moves from boot to production.

## `.env.local`

```dotenv
# ─── REQUIRED ───────────────────────────────────────────────────────────────
# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Server-only. Bypasses RLS — never expose to the browser, never prefix NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=

# ─── FEATURE ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # canonical host for emailed links, no trailing slash
HMAC_SECRET=                                  # signs /rate, /consent, /submit-photos links · 32+ chars
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SUPABASE_PHOTOS_BUCKET=session-photos
```

## Deliberately absent

**`CRON_SECRET`.** V6 ran three daily Vercel crons that permanently delete rows and storage objects
(`purge_soft_deleted` at 30 days, `prune_activity_log` at 90 days, photo expiry deleting the image
files). None is rebuilt here until a restore has been tested from a real backup — BUILD-PLAN §6 H4
and ADR 0003. Adding this variable is how those crons come back; do not add it casually.

**`ADMIN_EMAIL` / `GLOBAL_ADMIN_EMAIL`.** V6 granted admin rights by email address alone as a
bootstrap backdoor, outside its own role system. V7 authorizes from the role claim only.

## Two environments

Supabase gives you one set of keys per project. Use **separate Supabase projects** for local and
production — the service-role key bypasses RLS entirely, so a local run pointed at production data
is one typo away from destroying it.

| File | Points at | Committed |
|---|---|---|
| `.env.local` | the development Supabase project | never |
| Vercel project env vars | the production Supabase project | never — set in the dashboard |
