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
BREVO_SENDER_EMAIL=                           # fallback / platform sender (console invites)
BREVO_SENDER_PRACTITIONER=                    # optional — e.g. practitioner@iqcommune.com
BREVO_SENDER_SESSION=                         # optional — e.g. session@iqcommune.com
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SUPABASE_PHOTOS_BUCKET=session-photos
```

## Outbound email — which mailbox sends what

Client decision, 2026-07-23: practitioner-pipeline mail goes out from
`practitioner@iqcommune.com` and session mail from `session@iqcommune.com`, so a reply reaches the
person whose job it is rather than one shared inbox.

| Stream | Sender variable | Templates |
|---|---|---|
| `practitioner` | `BREVO_SENDER_PRACTITIONER` | empanelment agreement link, welcome, rejection, deactivation |
| `session` | `BREVO_SENDER_SESSION` | request received, follow-up, cancellation, admin new-request alert, consent request, photo guide, rating request |
| `platform` | `BREVO_SENDER_EMAIL` | console team invite |

The stream is declared on the template, not chosen by the caller — which mailbox an email belongs to
is a property of the email.

**Both per-stream variables are optional, and that is the point.** Each falls back to
`BREVO_SENDER_EMAIL`, so the app is already correct today and moves to the dedicated mailboxes the
moment they exist. Adding them is a Vercel env change and a redeploy; no code change.

### Before setting them

Google Workspace giving you the mailbox is not enough. **Brevo rejects a send from an address it has
not verified**, so setting the variable before verifying would turn every practitioner or session
email into a provider rejection — worse than the shared sender it replaced. In order:

1. Create the mailbox in Google Workspace.
2. Add it in Brevo (*Senders, Domains & Dedicated IPs → Senders*) and complete the verification email.
3. Confirm the `iqcommune.com` domain is authenticated in Brevo (SPF/DKIM), or mail will send but
   land in spam.
4. Only then set the variable in Vercel and redeploy.

To check the routing before any of that, leave `EMAIL_DELIVERY` unset: every send logs a dry run
carrying its `stream` and the `from` it resolved, so the mapping is verifiable with no mail sent and
no mailbox in existence.

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

## Which branches deploy

**Only `main`.** `vercel.json` sets `git.deploymentEnabled` so every other branch
is skipped:

```json
{ "git": { "deploymentEnabled": { "**": false, "*": false, "main": true } } }
```

Both wildcards are needed. Vercel matches these with
[minimatch](https://github.com/isaacs/minimatch), where `*` does **not** match
across `/` — so `*` alone would miss `v7/clone` and every other slashed branch
name. `**` covers those. A branch matching several rules deploys if *any* rule
is `true`, which is what lets the explicit `main: true` win over both.

### Why this exists

`v7/clone` is a mirror of `main`, pushed so the client has the branch. Its push
triggered a **Preview** deployment, which failed at
`next.config.ts` — `NEXT_PUBLIC_SUPABASE_URL must be set at build time`. Vercel
scopes env vars per environment and ours are set for Production only, so the
preview build had none.

The fix is not to add the variables to Preview. Doing that would put the
production `SUPABASE_SERVICE_ROLE_KEY` — which bypasses RLS entirely — into
every preview build, on URLs that are less protected than production. A mirror
branch is not worth widening access to real practitioner and session data.

If a genuine preview environment is ever wanted, give it its **own Supabase
project and keys**, add `main`'s sibling branch to the map above, and leave
`EMAIL_DELIVERY` unset there so a preview can never mail a real practitioner.
