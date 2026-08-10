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
CONTACT_EMAIL=                                # optional — inbox the site prints, not a sender
SESSION_CONTACT_EMAIL=                        # optional — mailto fallback on the request form
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

### The display name, per stream

What a recipient actually sees is `Name <address>`. The address is the section above; the **name**
is resolved separately by `senderNameFor()`, and since 2026-08-10 it differs by stream:

| Stream | Name | Override |
|---|---|---|
| `session` | Session Commune | `BREVO_SENDER_NAME_SESSION` |
| `practitioner` | Practitioner Commune | `BREVO_SENDER_NAME_PRACTITIONER` |
| `platform` | `BREVO_SENDER_NAME`, else `iqcommune` | — |

The same resolver supplies the **sign-off inside the body**, so a session email signs
"- Session Commune" and cannot drift from the name on the envelope. Only the sign-off moves;
"iqcommune" elsewhere in the copy names the organisation ("the iqcommune practitioner network") and
stays.

The two overrides fall back to a **constant, not to `BREVO_SENDER_NAME`**. That variable is set to
`IQCommune` in production, so falling back to it would leave the From line reading IQCommune while
the body signed Session Commune. Set the overrides only to *change* a name; unset already gives the
two above.

**The name is only half of what a recipient sees.** Until a verified `iqcommune.com` mailbox is
configured, Brevo sends from its own default address and the From line reads
`Session Commune <…@…brevosend.com>` — right name, wrong address. Fixing the address half means
verifying the mailboxes in Brevo and setting the sender variables above; no code change reaches it.

## Addresses the site displays

Three variables hold addresses that are only ever *rendered*. None is a Brevo sender, so none carries
the verification dependency above — each may be any mailbox someone actually reads, and each can
change with an env edit and a restart.

**`CONTACT_EMAIL` is the inbox the site prints**: the bottom line of the footer on every page, and
the closing "Confidential · Questions?" line under each of the six emailed link pages. It is resolved
on the server by `contactEmail()` in `lib/env.ts` and taken as the default of the `email` prop on
`SiteFooter` and `LinkPageShell`, so a page may still override it. Unset, it falls back to
`hello@iqcommune.com` — the address the site has always shown — so leaving it unset changes nothing.

It is deliberately *not* `BREVO_SENDER_EMAIL`: that one is a `From:` Brevo accepts only for a mailbox
it has verified, so repointing it to change what the website displays would break outbound platform
mail.

**Changing any of the three needs a redeploy, not just an env edit.** `/`, `/login` and
`/practitioners` are statically prerendered, so anything resolved on them — the footer address, and
both `mailto:` fallback recipients — is fixed at build time; the six emailed link pages are
server-rendered per request and pick up a change on restart. Set the variable and redeploy, and every
surface agrees. This is the same rule as the senders above and is Vercel's model for env vars anyway
— it is called out here only because the statically rendered half looks unchanged if you skip the
rebuild.

**The legal documents keep the address as a literal, on purpose.** `content/legal.ts`, the
end-of-agreement line in `OnboardingForm.tsx`, and the archived `docs/legal/privacy-policy.md` are
not templated from `CONTACT_EMAIL`. An unset variable rendering "write to us at undefined" inside a
privacy policy is a worse failure than a stale address; the rendered policy has to stay
word-identical to the archived copy; and changing a contact address in a legal document is a reviewed
commit, not an ops flip. A test in `tests/unit/env-contract.test.ts` asserts all three still carry
the same address as the fallback, so the two cannot drift apart silently.

**`PRACTITIONER_CONTACT_EMAIL` is the same offer on the empanelment application.** When an
application cannot be saved, the apply dialog offers a `mailto:` with the whole application
pre-drafted; this is its recipient, resolved in `PractitionerSections` and passed down through
`ApplyProvider`. Unset, it falls back to the practitioner sender.

A separate variable from the one below because the two forms are answered by different people — that
separation is the entire reason the per-stream mailboxes exist. The offer is made **only** when the
server actually failed (`INTERNAL`, or an unreachable server); a validation error is the applicant's
own to fix and emailing it would bypass the schema, and a rate limit exists precisely so it is not
routed around.

**`SESSION_CONTACT_EMAIL` is where visitors write, not where mail sends from.** When a session
request cannot be saved, the form offers a `mailto:` with the whole submission pre-drafted; this is
its recipient, read on the server and passed down as a prop. It is deliberately *not*
`BREVO_SENDER_SESSION`: that one is the `From:` Brevo sends as and may only hold a mailbox Brevo has
verified, so repointing it to change where visitors write would break every outbound session email.
Unset, it falls back to the session sender. The two are usually the same address and are free not to
be.

**Replies route separately, and are already correct.** That fallback decides only which mailbox mail
leaves *from*; on its own it would take replies with it, landing answers to automated session mail in
the shared human inbox. So `replyToFor()` sets `Reply-To` to the stream's own mailbox from a constant
in `lib/email/send.ts` — **not** from the variables above, and this is deliberate: Brevo validates the
sender and never `Reply-To`, so this half needs no mailbox verification and holds through the whole
window where the variables cannot safely be set. It is omitted once a stream sends from its own
address, where it would duplicate the `From`. Do not env-gate it — that reintroduces the dependency
it exists to avoid.

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

## Keeping Supabase awake

A free-tier Supabase project pauses after roughly a week with no database activity, and a paused
database means every page 500s until someone restores it by hand. `/api/keepalive` runs one
`select id … limit 1` against `gallery_photos`; `vercel.json` calls it at 03:00 and 15:00 UTC.

**It has to be a route that queries Postgres.** Pinging `/` would not work — that page is statically
prerendered and answered from Vercel's CDN, so Vercel would show traffic while Supabase saw none and
paused anyway.

**Two cron entries, not one.** Vercel Hobby caps each job at once per day but allows many jobs, so two
entries twelve hours apart are legal and give 14 pings a week. A single missed night then leaves a
12-hour gap rather than 48. If a deploy ever rejects the second entry, deleting it is a one-line fix.

`CRON_SECRET` guards the endpoint — Vercel attaches `Authorization: Bearer <it>` to cron invocations
automatically. Unset, the route refuses and logs an error rather than leaving an open endpoint. Both
outcomes are logged, because the usual way a keepalive fails is quietly.

**What this does not do.** It is a workaround, not a contract: Supabase decides what counts as
activity. More importantly it does nothing about the free tier having **no backups** — keeping a
backup-less database awake is not the same as making it safe. If real users depend on the site, the
paid plan removes pausing *and* adds daily backups, which is the failure that would actually hurt.

## Deliberately absent

**The three V6 purge crons.** V6 ran daily Vercel crons that permanently delete rows and storage
objects (`purge_soft_deleted` at 30 days, `prune_activity_log` at 90 days, photo expiry deleting the
image files). **None is rebuilt here, and none may be, until a restore has been tested from a real
backup** — BUILD-PLAN §6 H4 and ADR 0003.

`CRON_SECRET` now exists (see below) because a read-only keepalive needed it. That does **not** clear
the gate above: the blocker was never the missing variable, it is the untested restore. Rebuilding a
job that deletes anything still requires that work first.

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
