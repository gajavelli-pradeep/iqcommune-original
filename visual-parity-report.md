# Visual Parity Report — React vs V7 HTML

**Method:** Playwright (headless Chromium) screenshots each React page/section and its V7 HTML
reference at the same viewport, read back and compared. Fixes are re-screenshotted until the section
is visually indistinguishable, then locked. A dev-only preview harness (`app/dev-preview/[slug]`,
404 in production) renders the token-gated flow pages with mock props so their forms can be shot.

## Page status

| Page | V7 reference | Status |
|---|---|---|
| **Landing `/`** | `iqcommune-main-landing-page.html` | ✅ **Complete — all sections cloned & locked** |
| **Practitioners `/practitioners`** | `iqcommune-empanelment.html` | ✅ **Complete — 12/12 sections cloned & locked** |
| **Rate `/rate`** | `iqcommune-practitioner-rating.html` | ✅ **Complete** |
| **Consent `/consent`** | `iqcommune-session-consent.html` | ✅ **Complete** |
| **Photos `/submit-photos`** | `iqcommune-postsession-photos.html` | ✅ **Complete** |
| **Onboarding `/onboarding`** | `iqcommune-onboarding.html` | ✅ header/stepper/summary/agreement-toolbar/scroll-gate/hidden-signing-form; finer items (2-col name row, sig-tab ink-active, timestamp row, success receipt) remain |
| **Join-admin `/join-admin`** | `iqcommune-user-setup.html` | ✅ **Complete** |
| Admin console | `admin-console-automated.html` | 🔄 **tab by tab — 1/10 done** (see the console section) |

## Admin console — tab by tab

Each tab is finished completely (UI → schema → reads → mutations → workflow →
roles → runtime → responsive → regression) before the next begins.

| # | Tab | Status |
|---|---|---|
| 1 | **Practitioners** | ✅ **Complete** — see below |
| 2 | Agreements | ⬜ next |
| 3 | Session Requests | ⬜ |
| 4 | Session Consent | ⬜ |
| 5 | Session Details | ⬜ |
| 6 | Photos | ⬜ |
| 7 | Payouts | ⬜ (needs a paid-state migration — `invoice_reference` / `paid_on` are absent) |
| 8 | Gallery | ⬜ |
| 9 | Settings | ⬜ |
| 10 | Activity | ⬜ |

### Tab 1 — Practitioners

**Root cause found and fixed:** the pipeline's first four stages live in
`practitioner_applications`; the console read only `practitioners`
(`Empanelled | Paused | Deactivated`). The filter pills and pending card were
filtering over rows that could never hold those statuses. `listPractitioners`
now unions both tables, keyed `app:<id>` / `prac:<id>`, with an email fallback
for practitioners never linked to their application.

**Cloned:** 5 columns exactly (no invented Actions column) · avatar + `role · org`
+ `★ n avg` sub-line · city with state sub-line · pending stat-card · 5 filter
pills · period filter · **the expanded detail card** (identity, rating box,
kv-grid with Global-Admin correction controls, pipeline stepper, conditional
status control, per-stage automated actions, danger zone, Message/Notes).

**The conditional status control** — V7 shows a `<select>` on Applied / Screening
Done / Rejected and a read-only box otherwise, because the remaining stages are
system-set. Reproduced, enforced server-side in `setApplicationStage`, and pinned
by test so it cannot be "tidied" into an always-present dropdown.

**Workflow driven end to end** through a real signed-in session: Screening Done →
"Generate & send" creates the practitioner (`Pending`) + agreement, moves the
application to `Agreement Sent`, emails the onboarding link, logs the action.
A second click resends rather than issuing a second agreement (verified: 1
practitioner, 1 agreement, 2 distinct log entries).

**Verification:** `pnpm verify` green (196 tests, 41 files) · 0 console errors ·
no page-level horizontal scroll at 320/480/768/1024/1440/1920 · 0 controls under
44px under a coarse pointer · 0 clipped controls in the card at any width.

**Deliberate deviations** (each recorded where the code lives): sidebar gold badge
takes an ink label (V7's white is 2.1:1); the "Viewing as" role select is stated
not offered (roles are real routes, not a CSS class swap); the bell opens the
first waiting queue instead of toasting; Notes persists to `admin_notes` instead
of toasting "saved"; pipeline stage dates are omitted rather than fabricated —
V7's are hardcoded demo constants and the schema records no stage timestamps.

**Known gap:** the global search box in the console header is still inert. It is a
cross-entity search feature rather than a styling fix, so it is not half-built here.

## Practitioners — section-by-section (all locked)

1. **Header** — lockup grouped by the logo (was centre-floated); right CTA is the outlined gold pill.
2. **Hero** — perk icons added, first perk featured, 4 visible, 20px card, muted-white label, gold toggle.
3. **Trust bar** — three distinct icons (shield/dollar/clipboard-check), 15px, 48px gap.
4. **Roles grid** — un-inverted (cream section / white cards), 6 role icons, 12px radius, plain note.
5. **Process steps** — white section, dark-ink numbered circles, centred, 16px titles.
6. **Division of work** — 12px radius, 12px headers, inline 15px ink-faint checks, We-column left pad.
7. **Modules grid** — 40px card icons, inline gold `taughtBy`, bundle box with dark icon + pill chips.
8. **Fit lists** — forest-green good palette (`#6fcf6f`), faint X-circle not-for-you markers.
9. **Disclosure** — gold operational card, intro paragraphs, icon markers, left-gold-border note.
10. **Apply CTA** — 640px column, vertical reassurance stack, trailing-arrow **white-label** button.
11. **FAQs** — 12px items, ink-faint chevrons, 720px column (all 10 questions already matched).
12. **Footer** — outlined white pill, no extra divider (dynamic © year retained).

**Global fixes folded in:** 32px horizontal section padding at all breakpoints; 80px (`py-20`) vertical
section padding matching V7's base `section`; new tokens `--color-on-dark-faint`, `--color-gold-glow-strong`,
`--color-fit-good{,-surface,-edge}`, `--color-on-dark-edge`. Shared `SiteHeader`/`SiteFooter`/`FaqAccordion`
corrections also improve the landing/flow pages.

**Verification:** `pnpm typecheck` clean · 183 tests pass (incl. parity suites) · `eslint app components features`
clean (token guard) · 0 console errors on `/practitioners` · full-page height within ~3% (hero exact),
remaining delta is half-pixel V7 font sizes (13.5/14.5px) within rendering tolerance.

## Landing — fixes this pass

- **Systemic width bug (measured, not guessed):** V7 double-pads content sections
  (`section{padding:2rem}` + `.container{padding:2rem}` = 64px inset); React had only 32px, so cards
  were 32px too wide per side. Bundle cards were 300px vs V7's 279px. Added the container's `px-8` to
  all 16 content wrappers on **both** pages — bundle cards now measure 279px exactly.
- **Gallery** rebuilt as the V7 carousel (pill-less header, overlay-caption slides, prev/next + dots,
  reduced-motion-safe autoplay).
- **Gold CTA** → white label (client directive). Card radii → 12px across 7 cards. TrainerComparison
  internal divider removed. Takeaways callout gains its info icon. Ribbon gap 2.5rem. Bundle 3-col ≥480.
  ToolNote italic; tw-bars 40px.

**Known intentional deviations:** dynamic copyright year (vs mockup's hardcoded 2025); both columns of
Division-of-work kept on mobile (V7 hides one — content-parity rule/test); landing/practitioners
full-page height within ~4% (residual is V7's half-pixel 13.5/14.5px fonts, within rendering tolerance).
