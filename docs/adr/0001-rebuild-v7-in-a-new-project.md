# ADR 0001 — Rebuild V7 in a new project rather than patching the V6 codebase

**Date:** 2026-07-21 · **Status:** Accepted · **Decision owner:** project owner

## Context

The client delivered V7 (`client_requirements/thefinalfinalfiles (V7)/`, 8 HTML files) as the sole
authoritative spec, asked that all earlier versions be dropped, and set a target of going live
Thursday 2026-07-23.

The existing app (`iqcommune/`) is live and substantial: 35,489 TS/TSX lines, 71 API routes, 39
migrations (12 carrying RLS policies), 24 test files. Eight read-only audits were run against it
before deciding. Findings are recorded in `../../V7-INVENTORY.md` and `../../SDLC-SCORECARD.md`.

Measured V7 delta against the shipped app:

- `iqcommune-main-landing-page.html` — **byte-identical** to what is live
- practitioner-rating, post-session-photos, user-setup — **already at parity**
- admin console — 149 changed lines; empanelment — 223 changed lines
- 21 V7 strings absent from the app, all in one cluster (pre-tax disclaimers, rewritten agreement
  clauses, apply-modal bullets, override prompt copy)

The substantive change is removing payment and tax collection from the product entirely — UPI, bank,
IFSC, PAN, GST, TDS, net payout, invoice-name and family-payee — across ~30 files, because the
finance team now administers all of it offline.

## Decision

**Build V7 as a new Next.js project (`iqcommune-v7/`), section by section, rather than applying the
delta to the existing codebase.**

The rebuild carries forward the proven stack (Next 16.2.9, React 19.2.4, Tailwind 4, Supabase, Zod,
react-hook-form, jsPDF, Upstash) and adopts feature-based organisation with an explicit service
layer, addressing the architectural findings in the scorecard.

## Alternatives considered

**Apply the V7 delta in place** — recommended by the engineering analysis and *not* chosen. It fits
the two-day window, preserves 129 controls already verified working, and preserves the single
strongest audit result: all 71 API routes carry a server-side authorization guard with no UI-only
gate anywhere. Eleven runtime traps were already mapped for this path, including an
`ApplicationSchema.superRefine` that would fail 100% of applications and two `NOT NULL` columns that
would 500 every payout insert.

**Rejected because** the decisive factor was not engineering risk but comprehension: after seven
versions neither the project owner nor the client can state with confidence what the product
currently contains. Discovering missing copy or a dead control live in front of the client was
judged the more serious failure. The owner holds that risk and made the call.

## Consequences

**Accepted:**
- The Thursday date is at risk. A greenfield build re-ports 71 routes, 39 migrations and 21 env
  wirings before it can serve one request.
- Authorization must be re-established and re-verified from zero. Its failure mode is silent — a
  missing guard serves another tenant's data without raising an error. **This is the single highest
  risk of this decision** and every route must be guard-audited before launch, not after.
- V6's rebuild produced 100 non-matching controls, found only after it shipped. The same class of
  drift must be assumed here and measured rather than trusted.

**Gained:**
- The gates the previous codebase never had, present from the first commit: CI running lint +
  typecheck + test + build + audit on every PR (`.github/workflows/ci.yml`), a `typecheck` script,
  and `--max-warnings 0` instead of a 1,455-warning ratchet.
- Feature-based structure with a service layer, avoiding the five god-components (1639/1596/1447/
  1256/1152 lines) and the duplicated row types in the old console.
- A content-parity gate diffing rendered text against the V7 HTML — turning "did we miss any copy?"
  from a worry into a build failure.

## Follow-through

1. Content-parity gate before any page is called done.
2. Route-by-route authorization audit before launch — the old app's strongest property, rebuilt.
3. Carry forward the 39 migrations' schema intent; do **not** carry the payment/tax columns.
4. `../../V7-INVENTORY.md` Parts 4 and 6 list the traps and the data decisions that still apply.
