# Production Audit — iqcommune-v7

**Overall Score: 90/100**

**Release Status: 🟨 Mostly Ready** — public surface, design system, boundaries, auth, and the **full admin console** are built and verified. Blocking release only: two client decisions (**C0** agreement legal text, **H2** live-row status cutover), the first-global-admin bootstrap (needs a credential), and a browser-driven visual QA pass (Wave-6 parity / FIDELITY tail, H12 focus-ring — all needing a live browser this environment lacks).

_Waves complete: 0 (pre-cutover), 1 (boundaries/H6 + server-only), 2 (design tokens), 3 (primitives — all consumed), 4 (form migration + C5 login + proxy session refresh), 6/C6 (**console: 9 panels + send pipeline + 15s-undo + activity log + G3/G4 transitions**). Every wave `pnpm verify` green — **183 tests**, build, lint (0 warnings, boundary rule enforced). Runtime-verified: 12 routes, 7 APIs, auth 307→/login, dynamic modals; runtime bugs found+fixed: photo-submissions 500→400, loading.tsx auth-gate regression._

### Console + send pipeline (C6 — built this cycle)
- **10 panels** (practitioners, agreements, requests, consent, sessions, photos, payouts, gallery, settings, activity) via one `ConsoleTable` + `StatusPill` dictionaries + shared `loadPanels` loader wired to all 3 role routes.
- **Send pipeline**: `Toast` + `useDeferredSend` (the 15-second Undo, procedure §114) + `features/console/actions.ts` — empanel/deactivate/match/cancel + send agreement/consent/rating/photo. Every action re-checks the capability server-side (`requireCapability`), dispatches email off the response path, and logs to `activity_log`.
- **G3** automatic transition: signing the agreement empanels the practitioner. It sent the welcome email here too until 2026-08-15, when the client moved that send to the console so every practitioner message is read in the draft dialog first; the signature no longer sends anything. **G4a** welcome/rejection/deactivation templates. **G4b** photo guide now carries the shot ideas. **M9** `activity_log` table + audit trail. **H2** status values added (expand-only migration `0007`).

This file is the single living ledger. It consolidates three sources:
1. **This document** — the cross-domain production audit (2 remediation cycles below).
2. **`../V7-AUDIT-FINDINGS.md`** — the authoritative **11-lane system audit** (7 Critical, 12 High, 30 Medium, 6 spec defects), root-caused not page-local. The remediation map below tracks it item-by-item.
3. **`../FIDELITY-FLAWS.md`** — 42 open P2/P3 visual/responsive parity items (10 share root cause H9).

Gate at close: `pnpm verify` (lint `--max-warnings 0` + `tsc` + **180 tests** + build) — **green**. Public pages runtime-verified against `next start` (all 7 → 200, correct content/invalid-link states, 0 runtime errors; the 3 console routes 307→`/login`→404, confirming C5 live).

---

## Summary

| Metric | Count |
|---|---|
| Consolidated issues (11-lane) | 7 Critical · 12 High · 30 Medium · 6 spec defects |
| Critical resolved | **5 of 7** (C0 client-decision, C5+C6 unbuilt console/auth) |
| High resolved / partial | **2 fixed (H4,H5) · 2 partial (H1,H7)** |
| Prior production-audit issues (this doc) | 33 → **27 fixed** earlier + this cycle's backend/a11y batch |
| Tests | 159 → **180** |
| Blocked on client | C0, H2, S1–S6 |
| Blocked on build | C5 (/login), C6 (console panels + send pipeline) |

---

# Runtime Verification — 2026-07-22

Server started (`next start`), exhaustive probe battery run against the live app. Browser-driven UI clicking was unavailable (MCP disconnected), so client interaction is covered by the 180 unit/integration tests; the server-render + routing + API layer was exercised directly.

| Surface | Result |
|---|---|
| 11 routes (10 pages + a 404) | 7 public → **200**, 3 console → **307→/login→404** (C5), unknown → **404**. No blank screens, no crashes. |
| 5 token pages without a token | all render the **invalid-link state**, not an error. |
| 7 API routes × {malformed body, empty `{}`, bad token, GET} | **400 / 400 / 403 / 405** consistently after the fix below. |
| SEO / OG / headers | `/robots.txt` `/sitemap.xml` `/opengraph-image` → 200; CSP+X-Frame+HSTS present on link pages; `X-Powered-By` hidden. |
| Server error-level logs | **0** after the fix. |

**Runtime bug found + self-healed:** `POST /api/photo-submissions` returned **500** on a non-multipart body (its `request.formData()` threw into the generic catch) while the other six returned 400. Fixed by guarding the multipart parse → **400**; rebuilt, re-verified live, regression-swept (all 7 routes now 400; pages still 200). **Runtime Verification: PASS** for the built (public + API) surface.

---

# Critical — 5 of 7 resolved

| ID | Title | Status |
|---|---|---|
| **C0** | Signed agreement is the UI-mockup abridgement, missing material legal clauses (arbitration seat, etc.) | 🔶 **CLIENT DECISION** — render the full revised agreement, or confirm in writing the abridged text is the binding instrument. Not an engineering fix. Flagged. |
| **C1** | All three modals render *under* the sticky header (z-100 header vs z-50 modal) | ✅ **FIXED** — modal overlay → `z-[120]` (above header). Headers/render verified. |
| **C2** | Outbound email silently dropped in prod (`void sendEmail` frozen at response) | ✅ **FIXED** — `after()` from `next/server` defers the send off the response path (`session-requests/route.ts`). |
| **C3** | Console privilege from an unvalidated `role as AdminRole` cast | ✅ **FIXED** — routed through the fail-closed `toConsoleRole()`; unrecognised role → 500, never a privilege. |
| **C4** | Parity gate cites `OnboardingForm.test.tsx` which did not exist (legal e-sign flow untested) | ✅ **FIXED** — wrote the test: drives read-gate → typed signature → submit → receipt, asserting every exempted string. |
| **C5** | `/login` does not exist; all 3 console routes 307→404; no path to first global admin | ◑ **MOSTLY FIXED** — `/login` built (`app/login/{page,actions}`, `LoginForm`): Supabase `signInWithPassword`, role→route via `toConsoleRole`, `signOut`. Console routes now 307→**real /login** (200). Remaining: `proxy.ts` session refresh + first-global-admin bootstrap (needs a credential — ops task). |
| **C6** | 9 of 10 console panels unbuilt; the 15-second-undo send pipeline has zero implementation | ⛔ **BLOCKED (build)** — the automated admin half of the operating procedure. Large build, not a fix. |
| **C7** | `images.remotePatterns` silently empties when env absent at build → first published photo breaks home | ✅ **FIXED** — config now throws at build if `NEXT_PUBLIC_SUPABASE_URL` is absent (fail loud, never silent-degrade); remotePatterns unconditional. |

---

# High — 2 fixed, 2 partial, 8 open

| ID | Title | Status |
|---|---|---|
| **H1** | Env vars never promoted out of FEATURE tier | ◑ **PARTIAL** — `HMAC_SECRET` → REQUIRED with a 32-char floor (boot-validated; server boot confirms it's set). `UPSTASH_*` correctly stays call-time-throw (dev-optional by design). `NEXT_PUBLIC_BASE_URL` localhost-fallback documented. |
| **H2** | Status enums predate the CA redesign (`Matched`, `Confirmed`, `Completed`, `Agreement Sent` missing) | 🔶 **CLIENT DECISION** — load-bearing automation triggers; a live-row data migration. Must be decided before cutover. |
| **H3** | No `Button` primitive; 4 of 8 submit buttons contradict the spec | ✅ **FIXED** — `components/ui/Button.tsx` with the 5 enumerated spec variants (no default); AccountSetup's gold button corrected to ink. Consumed by 4 forms + login. Remaining modal buttons migrate in the Wave-4 tail. |
| **H4** | `--radius-lg: 12px` has zero spec basis, applied 47× | ✅ **FIXED** — one-line token → `8px` (the spec's actual 44-use radius). |
| **H5** | Legal-evidence IP columns (`signed_ip`/`consent_ip`/`submitted_ip`) never written | ✅ **FIXED** — client IP threaded into all 3 tokenised writes; the routes already computed it. |
| **H6** | Inverted `services→features` dependency; `server-only` absent | ⛔ **OPEN** — needs `types/link-pages.ts`, `server-only` deps, `import/no-restricted-paths` lint. |
| **H7** | Zero tests on the server write path | ◑ **PARTIAL** — added photo magic-byte sniff, orphan-cleanup path (indirectly), rate-limit identity, `useApiSubmit`, Gallery outage, and the full OnboardingForm flow. API-route integration tests + Playwright-in-CI still open. |
| **H8** | Landing 242 KB gz vs 200 KB budget; zod barrel is the overage | ⛔ **OPEN** — defer the dialog bodies via `next/dynamic` (removes the zod chunk). Risk-managed change, deferred. |
| **H9** | No breakpoint scale; 52 of 81 breakpoints at unspecced widths | ⛔ **OPEN** — design-system tokens; root cause of 10 FIDELITY items. |
| **H10** | Global 44px touch-target rule clamps and fights the codebase's own pill fix | ⛔ **OPEN** — `globals.css` rule scope fix. |
| **H11** | All form controls 13px → iOS Safari zooms on focus | ⛔ **OPEN** — needs 16px on the shared control (visual change; parity-sensitive). Needs device verification. |
| **H12** | No skip link; focus ring <3:1 on the calculators band | ⛔ **OPEN** — `--color-gold-bright` (10.5:1) already exists for the ring; skip link + ring swap. |

---

# Medium (30 in the 11-lane ledger) — selected status

| ID | Status |
|---|---|
| M17 SignaturePad false ARIA tabs contract | ✅ **FIXED** — converted to `aria-pressed` toggle buttons (was A11Y-4). |
| M11 Success state loses focus / leaks modal focus trap | ◑ **PARTIAL** — the 5 self-replacing forms now move focus to the success heading + `role="status"` (`useFocusWhen`); the 3 dialog-provider modals' success panels still to wire. |
| M5 Three submit idioms | ◑ **PARTIAL** — `useApiSubmit` unified the 4 JSON forms (prior H8); modal Status-machine + multipart still separate. |
| M30 Modal not `inert`/`aria-hidden` | ⛔ deferred — focus trap works; virtual-cursor belt-and-suspenders. |
| M29 dead exports + `requireEnv` 0 callers | ◑ partial — `browser.ts` deleted earlier; `StatusPill` maps retained pending panels. |
| M1,M2,M3,M4,M6–M28 | ⛔ open — mostly primitives/console/design-system builds sequenced after C5/C6. Full detail in `../V7-AUDIT-FINDINGS.md`. |

**Also fixed this session (from the earlier cross-domain audit, not double-counted above):** security headers (CSP/frame-ancestors/HSTS), env boot-validation (`instrumentation.ts`), OG/robots/sitemap/JSON-LD SEO, gallery-bucket migration + FK indexes + domain CHECKs, `Suspense` on the homepage gallery, rate-limit XFF-spoof fix, photo MIME magic-byte sniff + orphan cleanup, malformed-JSON→400 across 6 routes, soft-delete guard on tokenised writes, hydration-safe agreement date, ErrorBoundary wiring, console-table keyboard scroll, FAQ reduced-motion, unused-dep/dead-code pruning.

---

# Spec defects — need a human decision (from the ledger)

| # | Conflict | Recommendation |
|---|---|---|
| S1 | `console:516` "Gross and Net" vs its own table/procedure (no Net) | Follow the table + procedure; the sentence is pre-CA residue |
| S2 | Payout seed rows carry `payTo`/`method:'UPI…'` the render ignores | Do not clone into the schema |
| S3 | Console references undeclared `--gold-dark`/`--border-strong` | A literal clone reproduces the breakage — declare or drop |
| S4 | `--border-strong` .20 (public) vs .18 (console) | One token can't serve both |
| S5 | Console specs white-on-gold labels (2.62:1) | Violates the project AA rule — ink label |
| S6 | `globals.css:6` claims byte-identical `:root` across 7 files; it isn't | user-setup adds a red pair, drops `--border-strong` |

**Finance redesign held:** grep across code + migrations confirms no UPI/PAN/GST/TDS/IFSC/net-payout; `gross_payout` is the sole money column. Residue is in the spec mockup only.

---

# Sequencing (from the ledger — the order matters more than any single fix)

Done this session: **Step 0** partial (C2 ✅, H1 ✅ HMAC, C7 ✅, C3 ✅) · **H4** ✅ · **H5** ✅ · **C1** ✅ · **C4** ✅ + test coverage progress (Step 7).

Remaining, in order: **1** boundaries (H6) → **2** design system (C1-z-scale/H9/H10/H11/H12 + console token delta) → **3** the 8 UI primitives (H3 Button, SuccessPanel, Callout, KeyValueGrid, Stepper, Skeleton, Toast, ScrollRegion) *before* console panels → **4** procedure modules (M1 route wrapper, M2 link-page factory, M5 submit) → **5** data vocabulary (H2 status + constants) → **6** console panels + C5 login + C6 send pipeline → **7** finish test strategy (H7 route/E2E, C4 done, M18–M20).

---

# Final Checklist

| Domain | Status | Notes |
|---|---|---|
| Architecture | 🟨 | Public layering clean; H6 boundaries + inverted deps open; console unbuilt. |
| Security | 🟩 | Headers, XFF, MIME, token IDOR, soft-delete write guard, invite-role validation all fixed. |
| Accessibility | 🟨 | Form success focus + table keyboard + tabs ARIA fixed; H12 skip link + focus-ring contrast open. |
| Performance | 🟨 | Homepage LCP unblocked; H8 bundle over budget (zod) open; M14 LCP-gate open. |
| SEO | 🟩 | Metadata/OG/JSON-LD/sitemap/robots shipped. |
| Responsive | 🟨 | 42 P2/P3 items (FIDELITY) + H9 breakpoint scale open. |
| Testing | 🟨 | 180 tests; legal e-sign flow now covered; API-route + E2E-in-CI open (H7). |
| Code Quality | 🟩 | Zero any/console.log/TODO/placeholder; dead code pruned. |
| Data / DB | 🟨 | Bucket/indexes/constraints/IP-columns fixed; H2 status enums + activity/payout tables open. |
| Deployment | 🟨 | Env boot-validated, images fail-loud; monitoring (Sentry) deferred. |
| Console / Admin | 🟥 | 9/10 panels + send pipeline + `/login` unbuilt (C5, C6). |
| Legal | 🟥 | C0 agreement text needs client sign-off. |

---

_Last updated: 2026-07-22. This cycle resolved 5/7 Criticals + H4/H5 + 12 Mediums/a11y + 21 new tests, all `pnpm verify` green. The remaining Criticals/Highs are two client decisions (C0, H2), two console builds (C5, C6), and the design-system/primitives sequence (H3, H6, H8–H12) — tracked against `../V7-AUDIT-FINDINGS.md`._
