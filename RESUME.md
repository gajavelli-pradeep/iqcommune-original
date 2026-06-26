# IQCommune — Session Handoff

**Date:** 2026-06-26  
**Status:** All 33 tests passing · Dev server working · All public + admin flows tested

---

## What Was Accomplished

### P1 Security Fixes
- **Signature forgery (onboarding/sign):** Added binding guard — unsigned top-level `ref` is now verified against HMAC-covered `linkParams.ref`. Forged ref → 403. (`app/api/onboarding/sign/route.ts`)
- **Photo submission tampering:** Same class of fix — all 6 unsigned top-level fields now bound to verified `linkParams`. (`app/api/photo-submissions/route.ts`)

### Critical Bug Fixes
- **ENCRYPTION_KEY:** Was 35 chars (invalid for AES-256-GCM), fixed to 64 hex chars in `.env.local`. Boot validation in `lib/env.ts` now enforces exactly 64 chars.
- **Admin middleware case-sensitivity:** `middleware.ts` ADMIN_EMAIL check was case-sensitive vs `require-admin.ts` which used `.toLowerCase()`. Fixed to match.
- **Payout email gross vs net:** `mark-paid` route was emailing `gross_amount` instead of `net_amount`. Fixed with `net_amount` added to select.
- **Double prefix bug:** `AgreementTable.tsx` prepended `IQC-EMP-` to refs that already contained it → `IQC-EMP-IQC-EMP-DV003`. Fixed with `.replace(/^IQC-EMP-/, "")`.
- **ZodError on module toggle:** `ApplicationForm.tsx` `toggleModule` had `shouldValidate: true` triggering full-form Zod validation. Changed to `false`.

### Accessibility / UX Fixes
- **404 page CTA:** Primary "Go home" button was ink-on-ink (invisible). Fixed to gold fill + ink label.
- **Hero gold text contrast:** `page.tsx` "from professionals" used raw `#c9982a` (2.6:1 — WCAG AA fail on white). Changed to `var(--gold-dark)`.
- **Close button touch target:** `RequestModal.tsx` close was 32×32px. Fixed to 44×44.
- **CTA captions:** `rgba(255,255,255,0.45)` → `0.62` where body text contrast was below AA.

### Schema & Test Fixes
- `lib/schemas/session-request.ts`: `topic` changed from `z.string().min(1)` → `z.enum(TOPICS)` to reject invalid topics at API layer.
- `tests/unit/schemas.test.ts`: Updated 5 stale fixtures to match current schemas — added `state`, split `name` → `firstName`/`lastName`, fixed `groupSize` en-dash → hyphen, added `spocDeclaration: true`, valid module enum, `state` in `linkParams`.
- `tests/unit/api-sign.test.ts`: Fixed ref mismatch in two test cases (binding guard was firing before DB check because `IQC-EMP-0042 ≠ IQC-EMP-42`).

**Result: 33/33 tests passing.**

### Temp Admin Credentials
- Email: `test-admin@iqcommune.in` / Password: `TestAdmin!2026provision`
- **Delete when done:** `node scripts/_tmp_provision_admin.mjs delete`

---

## Remaining P2 Items (not yet done)

| # | Item | File |
|---|------|------|
| 1 | Onboarding page duplicates nav instead of reusing `SiteHeader` | `app/(onboarding)/…` |
| 2 | `SiteHeader` mobile drawer not `inert`/`aria-hidden` when closed | `components/public/SiteHeader.tsx` |
| 3 | `StatusPill` all-hex color map → `var(--token)` | `components/shared/StatusPill.tsx` |
| 4 | Admin `deltaRed` used for "needs action" counts (should be amber per semantic rules) | admin layout |
| 5 | `RequestModal` lacks focus trap | `components/public/RequestModal.tsx` |
| 6 | Stat cells and filter chips are div-as-button (not keyboard accessible) | admin console |
| 7 | Admin layout uses inline styles only (blocks responsive media queries) | admin views |
| 8 | `img-src` in `next.config.ts` may not cover `*.supabase.co` — CSP gap | `next.config.ts` |

---

## Architecture Quick-Reference

| Concern | Detail |
|---------|--------|
| Stack | Next.js 15 App Router · React 19 · Tailwind v4 (`@theme` in `globals.css`) · Supabase · Brevo |
| DB | `ltjwacqxcsxlyrgfuajb.supabase.co` — all migrations applied (0001–0011) |
| Color rule | All colors via `var(--token)` — never raw hex. Exception: `opengraph-image.tsx` (Satori) + SVG `stroke`/`fill` attributes |
| Gold on light | text → `var(--gold-dark)` · fill → `var(--ink)` label (white-on-gold fails WCAG AA) |
| HMAC | Onboarding URLs signed with `HMAC_SECRET` via `lib/hmac.ts` |
| Encryption | AES-256-GCM · `ENCRYPTION_KEY` must be exactly 64 hex chars |

---

## To Resume

1. `pnpm dev` in `iqcommune_project/iqcommune/`
2. `npx vitest run` → confirm 33/33 pass
3. Continue from P2 items above or test any new flows
