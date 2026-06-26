# IQCommune

A platform connecting learners with active finance practitioners for in-person educational sessions. Practitioners are working professionals — equity analysts, portfolio managers, CFPs, wealth advisors — who teach what they'd stake their own money on.

**Live:** https://iqcommune.vercel.app

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind v4 (`@theme` in `app/globals.css`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (admin role via `app_metadata.role = 'admin'`) |
| Email | Brevo (transactional) |
| Rate limiting | Upstash Redis |
| PDF | jsPDF |
| Forms | React Hook Form + Zod v4 |
| Testing | Vitest (unit) · Playwright (e2e) |
| Deployment | Vercel — `main` branch is the active deployment |

---

## Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp .env.example .env.local

# 3. Run the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

All variables are validated at boot in `lib/env.ts` — the server will refuse to start with missing or malformed values.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `HMAC_SECRET` | Min 32 chars — signs onboarding URLs (`lib/hmac.ts`) |
| `ENCRYPTION_KEY` | Exactly 64 hex chars (32 bytes) — AES-256-GCM encryption |
| `BREVO_API_KEY` | Brevo transactional email key |
| `BREVO_SENDER_EMAIL` | Verified sender address |
| `NEXT_PUBLIC_BASE_URL` | Full origin e.g. `https://iqcommune.vercel.app` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `SUPABASE_PHOTOS_BUCKET` | Supabase Storage bucket name for photo submissions |
| `CRON_SECRET` | Min 16 chars — authenticates `/api/cron/*` requests |

> **`ADMIN_EMAIL`** is a dev-only convenience for bootstrap. In production, grant admin access via `app_metadata.role = 'admin'` in Supabase Auth directly.

---

## Commands

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint (includes no-raw-hex rule)
pnpm test         # Vitest unit tests
pnpm test:watch   # Vitest in watch mode
pnpm test:e2e     # Playwright end-to-end tests
pnpm test:e2e:ui  # Playwright with UI
```

---

## Project Structure

```
app/
  (public)/         Public-facing pages (home, practitioners, onboarding)
  (admin)/          Admin console (auth-gated)
  api/              API routes
  globals.css       Design tokens + all hover/animation CSS
components/
  public/           SiteHeader, SiteFooter, NavBar, RequestModal, FaqAccordion…
  admin/            AdminConsoleView, tables, modals
  shared/           StatusPill, cross-cutting UI
  ui/               Low-level primitives (selectStyle)
lib/
  schemas/          Zod schemas — single source of truth for all API contracts
  supabase/         Supabase client + type definitions
  email/            Brevo templates, idempotency, delivery
  pdf/              jsPDF agreement generation
  hmac.ts           HMAC URL signing
  encrypt.ts        AES-256-GCM encryption
  env.ts            Boot-time env validation
supabase/
  migrations/       Sequential SQL migrations (0001–0011)
  seed.sql          Dev seed data
scripts/
  seed-admin-test-data.sql   Admin test fixtures
  push-test-data.mjs         Push test data to Supabase
tests/
  unit/             Vitest unit tests
  e2e/              Playwright end-to-end tests
```

---

## Design System

Brand: **ink + cream + gold** — premium professional-services. All colors come from CSS custom properties in `app/globals.css`. **Never use raw hex values** — ESLint enforces this.

### Token Map

| Category | Token | Value |
|----------|-------|-------|
| Text | `--ink` | `#14161d` |
| Text muted | `--ink-muted` | `#383b47` |
| Text soft | `--ink-soft` | `#5b5e6c` |
| Text faint | `--ink-faint` | `#71717f` |
| Surface | `--surface` | `#ffffff` |
| Surface soft | `--surface-soft` | `#f8f7f4` |
| Surface sunken | `--surface-sunken` | `#f4f2ec` |
| Input | `--input-paper` | `#fcfbf8` |
| Brand | `--gold` | `#c9982a` |
| Brand light | `--gold-light` | `#f5e9c8` |
| Brand dark | `--gold-dark` | `#8a6510` |
| Success | `--green` / `--green-light` | |
| Error | `--red` / `--red-light` | |
| Info | `--blue` / `--blue-light` | |
| Warning | `--amber` / `--amber-light` | |

**Color rules:**
- Semantics are reserved — `--green` = success, `--red` = true errors only, `--gold` = brand/primary.
- Gold text on light surfaces → use `--gold-dark` (raw gold fails WCAG AA contrast).
- Gold fill buttons → use `--ink` label, never white (white-on-gold fails WCAG AA).
- `var()` does not work in `app/opengraph-image.tsx` (Satori) or SVG `stroke`/`fill` attributes — use literals there only.

### CSS Classes (globals.css)

| Class | Purpose |
|-------|---------|
| `.btn-cta` | CTA buttons — lift + brighten + arrow nudge on hover |
| `.topic-card`, `.role-card`, `.module-card`, etc. | Cards — lift + accent border + icon fill on hover |
| `.hover-lift` | Trust bar / ribbon items — gentle translateY(-2px) |
| `.row-hover` | Table rows — gold tint on hover |
| `.aud-chip` | Audience selection chips — lift + gold border on hover |
| `.faq-row` | FAQ accordion rows — surface-soft background on hover |
| `.foot-link` | Footer / muted links — gold color on hover |
| `.link-arrow` | Text links with chevron — gold color + arrow nudge |
| `.nav-logo` | Site logo — opacity fade + lift |
| `.iq-animate` / `.iq-visible` | Scroll-triggered entrance animations |
| `.hero-stagger` | Hero content stagger entrance |
| `.page-transition` | Page-level fade-up transition |

All hover rules are guarded with `@media (hover: hover)` — touch devices never trigger sticky hover states.

---

## Shared Components — Non-Negotiable

Reuse, never copy:

- **`components/public/SiteHeader.tsx`** — sticky nav with logo, optional badge, right slot, and mobile drawer. Home uses the `NavBar` preset; other pages pass their own props.
- **`components/public/SiteFooter.tsx`** — footer with top slot, tagline, email, and dynamic copyright year.
- **`components/public/RequestModal.tsx`** — "Request a Session" form modal; used across all public pages via the `variant` prop (`nav` | `hero` | `gold` | `mobile`).

New public page → compose these + existing section components. Identical structure with different data → one prop-driven component, not a copy.

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied sequentially:

```
0001  initial schema
0002–0006  incremental additions
0007  request_cancelled status
0008  v2 schema additions
0009  photo_submissions table
0010  sent_emails table (idempotency)
0011  fix nullable columns
```

Apply to a local Supabase instance with:
```bash
supabase db push
```

---

## Security Notes

- All onboarding URLs are HMAC-signed (`lib/hmac.ts`). Unsigned or tampered fields return 403.
- Photo submission fields are bound to HMAC-verified `linkParams` — top-level overrides are rejected.
- Sensitive data (e.g. payout details) is AES-256-GCM encrypted at rest (`lib/encrypt.ts`). `ENCRYPTION_KEY` must be exactly 64 hex characters.
- All public mutations are rate-limited via Upstash Redis.
- Cron endpoints require a `CRON_SECRET` bearer token.

---

## Deployment

Vercel auto-deploys on push to `main`. Environment variables are set in the Vercel project dashboard — they are not committed to the repo.

```bash
# Push to production
git push origin main
```
