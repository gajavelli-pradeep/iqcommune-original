# iqcommune — V7

Next.js (App Router, v16) + React 19 + Tailwind v4, backed by Supabase. Public marketing site,
practitioner network, tokenised email-link flows (rate / consent / photos / onboarding / admin
invite), and the admin consoles.

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Environment is validated at boot (`instrumentation.ts` → `lib/env.ts`); a missing variable fails the
server fast and names the problem. Copy the variables from **`docs/ENVIRONMENT.md`** into
`.env.local` before running — there is no committed `.env.example` (deliberate; see that doc).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint (`--max-warnings 0`; includes the raw-colour-literal guard) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit + parity tests |
| `pnpm test:e2e` | Playwright |
| `pnpm verify` | lint + typecheck + test + build — the full gate |

## Layout

```
app/            App Router routes (public pages, tokenised link pages, admin consoles, /api)
components/     Shared chrome (SiteHeader/Footer, LinkPageShell) + UI primitives (Field, Modal…)
features/       Per-surface sections & forms (landing, practitioners, rate, consent, onboarding…)
hooks/          Shared client hooks (useApiSubmit)
lib/            env, logger, tokens (HMAC link contract), rate-limit, api envelope, email, supabase
services/       Server-only data access (service-role client; never imported client-side)
supabase/       SQL migrations (0001…0005)
docs/           ADRs, ENVIRONMENT contract, build plan, tool specs
```

## Security & conventions

- **Tokenised links** (`/rate`, `/consent`, `/submit-photos`, `/onboarding`, `/join-admin`) take one
  HMAC-signed `t` param; the row acted on comes from the verified token, never the URL body
  (ADR-0004). Invalid/expired/consumed links render the page's invalid-link state.
- **Security headers** (CSP, `frame-ancestors 'none'`, HSTS, nosniff…) are set in `next.config.ts`.
- **Colours** go through `var(--token)` from `app/globals.css`; the lint guard blocks raw hex.
- **Production audit ledger:** `flaws.md`. Visual/responsive parity: `FIDELITY-FLAWS.md`.

## Deploy

Vercel (production branch: `main`). Set the production Supabase project's keys + `HMAC_SECRET` +
`NEXT_PUBLIC_BASE_URL` in the Vercel dashboard — never point a local run at the production
service-role key (it bypasses RLS). See `docs/ENVIRONMENT.md` and `docs/adr/0003-*`.

<!-- deploy-access-test: confirming this commit's author can trigger a Vercel deployment -->
