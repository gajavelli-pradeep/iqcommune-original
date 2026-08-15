# Standing up a new Supabase project for iqcommune V7

Everything needed to take an empty Supabase project to a working production
database, in order, in one file. Follow it top to bottom.

**Why this exists.** Production currently reads a Supabase project holding the
*previous* system's schema. The V7 code asks it for `practitioners.full_name`;
that project calls the column `name`, so the console shows *"session_requests
read failed: column practitioners_1.full_name does not exist"*. It is not a
missing column — it is a different generation of the database. The fix is a new
project on the V7 schema, which is what follows.

**Time:** about 30 minutes, plus a redeploy.
**You need:** a Supabase account, access to the Vercel project, and this repo
checked out.

---

## The short version

| # | Step | Where |
|---|---|---|
| 1 | Create the project | Supabase dashboard |
| 2 | Run `supabase/consolidated-0001-0017.sql` | Supabase → SQL Editor |
| 3 | Verify the schema landed | Supabase → SQL Editor |
| 4 | Collect four values | Supabase → Settings → API |
| 5 | Point your local app at it and smoke-test | `.env.local` |
| 6 | Create the first admin | terminal |
| 7 | Point Vercel at it and redeploy | Vercel → Settings → Environment Variables |
| 8 | Verify production | browser |

Steps 1–6 are safe and reversible. **Step 7 is the one that changes what the
public site reads.** Nothing before it affects production.

---

## Step 1 — Create the project

1. <https://supabase.com/dashboard> → **New project**.
2. Fill in:
   - **Name** — something unmistakable, e.g. `iqcommune-production`. The current
     confusion exists partly because the live database is named after a
     different product entirely.
   - **Database password** — generate a strong one and **save it in your password
     manager now**. It is shown once. You do not need it for the app (the app
     uses API keys), but you need it for direct SQL access and it cannot be
     recovered, only reset.
   - **Region** — `ap-south-1` (Mumbai) for an India-facing site. This matches
     the existing projects and cannot be changed later.
3. Wait for provisioning (~2 minutes) until the status reads **Active**.

> **Free tier pauses after 7 days of inactivity.** A paused project takes the
> production site down. If this is genuinely production, it belongs on a paid
> plan.

---

## Step 2 — Run the schema

The whole schema is one file: **`supabase/consolidated-0001-0017.sql`** in this
repo. It is generated from the sixteen numbered migrations in
`supabase/migrations/` and produces the same end state in a single run.

1. Supabase → **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/consolidated-0001-0017.sql`, copy **all** of it, paste it in.
3. Press **Run** (or Ctrl/Cmd + Enter).

### What you should see

**`setval` and a value of `1`.** That is the last statement in the script — a
sequence counter for reference numbers — and reaching it means everything before
it ran. It is a result, not an error.

> **The number tells you which database you are on.** On a genuinely empty
> project it is **`1`**. If it comes back as anything else, the database already
> had data and you are on the wrong project — **stop and check** before going
> further.

### What it creates

- **12 tables** — `session_requests`, `practitioner_applications`,
  `practitioners`, `practitioner_agreements`, `sessions`,
  `session_practitioners`, `session_ratings`, `gallery_photos`,
  `photo_submissions`, `admin_invites`, `activity_log`, `email_log`
- **2 storage buckets** — `gallery` (public; the landing-page photos) and
  `session-photos` (private). **You do not need to create these by hand** — the
  script does it.
- Row-level security enabled on every table, indexes, triggers, and the
  reference-number generators.

### Do not run this against a database that already has tables

Every `CREATE` is `IF NOT EXISTS`, which sounds safe and is the trap: on a
database that already has a `practitioners` table, the statement is **silently
skipped** and the old shape survives. The script reports success and fixes
nothing, while creating the handful of tables that *were* missing — leaving a
half-and-half schema. **Fresh, empty projects only.** An existing V7 database
takes the numbered files in `supabase/migrations/`, in order.

---

## Step 3 — Verify the schema landed

Paste this into the SQL Editor and run it. Do not skip it — it takes five
seconds and catches a partial run before it becomes a production incident.

```sql
select
  (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('session_requests','practitioner_applications','practitioners',
                          'practitioner_agreements','sessions','session_practitioners',
                          'session_ratings','gallery_photos','photo_submissions',
                          'admin_invites','activity_log','email_log'))          as tables_found,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'practitioners'
       and column_name = 'full_name')                                            as has_full_name,
  (select count(*) from storage.buckets where id in ('gallery','session-photos')) as buckets,
  (select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid
     where t.typname = 'practitioner_application_status')                        as application_statuses;
```

**Expected:** `tables_found = 12`, `has_full_name = 1`, `buckets = 2`,
`application_statuses = 9`.

Anything lower means the script did not finish. Scroll back through the SQL
Editor output for the first red error and fix that, rather than re-running the
whole file over a partial state.

---

## Step 4 — Collect the values

Supabase → **Settings** (gear, bottom left) → **API**.

Copy these three, exactly as shown, with no trailing spaces:

| Dashboard label | Goes into | Notes |
|---|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-id>.supabase.co` — no trailing slash |
| **Project API keys → `anon` `public`** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser. Long JWT starting `eyJ…` |
| **Project API keys → `service_role` `secret`** | `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses all row-level security.** Server-only, never in a browser, never in git, never in a screenshot or chat message |

> The two keys look almost identical — both are long JWTs beginning `eyJ`.
> Swapping them is the single most common mistake here, and it fails in a
> confusing way: the app boots fine and then every database read comes back
> empty, because the anon key is subject to RLS and nothing has a public policy.
> Decode either at <https://jwt.io> — the payload names its own `role`.

Also note the **project ref** — the `<project-id>` in the URL. It is how you
tell projects apart later.

### Fill this in

Keep it somewhere private (password manager, not a shared doc):

```
Project name .......... ______________________________
Project ref ........... ______________________________
Region ................ ap-south-1
Database password ..... (in password manager)
Project URL ........... https://______________.supabase.co
anon key .............. eyJ...
service_role key ...... eyJ...   ← secret
```

---

## Step 5 — Point your local app at it and smoke-test

Do this **before** touching Vercel. If something is wrong you will find it here,
where nobody is watching.

Edit `.env.local` (git-ignored, never committed) and replace the three Supabase
values with the ones from Step 4. Leave everything else as it is.

```bash
pnpm dev
```

Open <http://localhost:3000>. Expect: the landing page renders, and the
"Sessions in the room" gallery shows the twenty illustrative slides — that is the
designed empty state, since no photos are published yet.

### The full set of variables the app needs

Seven are checked at boot; the app refuses to start without them, naming the one
that is wrong. Only the first three change in this exercise.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Step 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Step 4 |
| `NEXT_PUBLIC_BASE_URL` | yes | Canonical site URL, no trailing slash |
| `HMAC_SECRET` | yes | Signs the tokenised email links. ≥32 chars: `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | yes | Upstash console → your database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Same page |
| `BREVO_API_KEY` | for email | <https://app.brevo.com/settings/keys/api> |
| `BREVO_SENDER_EMAIL` | for email | Must be a **verified sender** in Brevo |
| `EMAIL_DELIVERY` | for email | `live` sends. Anything else logs and sends nothing |
| `ADMIN_NOTIFY_EMAIL` | optional | Where new-request alerts go |
| `CRON_SECRET` | for keepalive | Guards `/api/keepalive`. ≥16 chars: `openssl rand -base64 24` |
| `BREVO_SENDER_NAME_SESSION` | optional | Overrides the "Session Commune" display name |
| `BREVO_SENDER_NAME_PRACTITIONER` | optional | Overrides the "Practitioner Commune" display name |

> **Set `CRON_SECRET`, or the project will pause.** A free-tier Supabase project sleeps after about a
> week with no database activity, and `/api/keepalive` is what prevents that — but it refuses to run
> without this variable, by design, so an unset value means the protection silently does nothing. See
> `docs/ENVIRONMENT.md` → "Keeping Supabase awake".

> `HMAC_SECRET` is not cosmetic: it signs the onboarding, consent, rating and
> photo-upload links. **Change it and every link already emailed stops working.**
> Generate it once for this project and keep it stable.

> **Do not carry `EMAIL_DELIVERY=live` across from a dev machine by accident.**
> With it set, ordinary console actions mail real people.

---

## Step 6 — Create the first admin

A new project's `auth.users` is empty. The console authorises from
`app_metadata.role` only — there is no email backdoor, and an invite needs an
existing admin to send it. So the first account is created out-of-band:

```bash
node --env-file=.env.local scripts/create-admin.mjs you@example.com 'a-strong-password'
```

Defaults to `global_admin`; pass `admin` or `user` as a third argument for
anything else. It prints `✓ Created … Sign in at /login`.

Then sign in at <http://localhost:3000/login> with those credentials and confirm
the console loads. **If this works locally, it will work in production** — same
database, same keys.

Everyone else is invited from **Settings → Team & Access** inside the console.

---

## Step 7 — Point Vercel at it

This is the step that changes production.

1. Vercel → your project → **Settings → Environment Variables**.
2. Update the three values from Step 4, each scoped to **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Confirm `EMAIL_DELIVERY`, `HMAC_SECRET`, `NEXT_PUBLIC_BASE_URL` and the
   Upstash pair are present too.
4. **Redeploy.** Editing a variable does not affect the running deployment —
   Deployments → latest → ⋯ → **Redeploy**. Skipping this is why "I changed it
   and nothing happened".

Only `main` deploys. `vercel.json` sets `deploymentEnabled` so every other
branch is skipped, and env vars are scoped to Production only — which is why a
preview build fails at `next.config.ts` with *"NEXT_PUBLIC_SUPABASE_URL must be
set at build time"*. That is expected, not a fault.

---

## Step 8 — Verify production

1. Open the production URL. The landing page and the gallery should render.
2. Sign in at `/login` with the Step 6 account and open the console. Every tab
   should load — **the `full_name` error should be gone.**
3. Submit a session request from the public form and confirm the row appears
   under Requests.

If the console still shows the old error, the redeploy did not happen or the
variables are scoped to the wrong environment.

---

## The data does not come with it

A new project starts empty. The previous system's database holds roughly **25
practitioners, 24 session requests, 15 sessions, 10 agreements and 5 payouts**,
and none of it transfers by itself.

It also cannot be copied straight across — the schemas differ by more than
names. `practitioners` has 42 columns there and 12 here; `name` becomes
`full_name`; `agreements` becomes `practitioner_agreements`; several tables have
no counterpart at all. Moving it means a mapping script, written and tested
against the new schema.

**Decide before Step 7 whether that data must survive.** If yes, plan the
migration first and cut over once. If it can be re-entered or is test data, the
empty project is simpler and cleaner.

---

## If it goes wrong

Nothing here is irreversible: the old project is untouched and still holds its
data. Put the three previous values back in Vercel and redeploy.

| Symptom | Cause | Fix |
|---|---|---|
| `column practitioners_1.full_name does not exist` | Pointing at the old V6 schema | The redeploy did not run, or the vars are on the wrong environment |
| `55P04 unsafe use of new value` | Ran the sixteen migration files as one paste instead of the consolidated file | Use `consolidated-0001-0017.sql` — it exists for this |
| Final `setval` returns something other than 1 | The project was not empty | Check the project ref; you are probably on an existing database |
| Console loads, every list is empty | `anon` key in the `SUPABASE_SERVICE_ROLE_KEY` slot | Swap them; RLS is hiding everything |
| Build fails: *must be set at build time* | Env vars missing for that environment | Expected on preview branches; on Production, add the vars |
| `Missing NEXT_PUBLIC_SUPABASE_URL` from the admin script | `--env-file` not passed | `node --env-file=.env.local scripts/create-admin.mjs …` |
| Site works, no email arrives | `EMAIL_DELIVERY` unset, or an unverified Brevo sender | See below |

**On email specifically:** Brevo accepts a send with HTTP 201 and *then* rejects
it if the From address is not a verified sender — so it looks sent and never
arrives. The `email_log` table records every attempt; the truth about delivery
is Brevo's own event feed
(`GET /v3/smtp/statistics/events?email=…`). Only verified senders deliver.

---

## Related

- `supabase/consolidated-0001-0017.sql` — the schema, one run
- `supabase/migrations/` — the numbered files; source of truth, and what an
  existing database takes
- `docs/ENVIRONMENT.md` — the variables in depth
- `scripts/create-admin.mjs` — the bootstrap account
