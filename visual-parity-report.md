# Visual Parity Report — React vs V7 HTML

**Method:** Playwright (headless Chromium) screenshots each React page/section and its V7 HTML
reference at the same viewport, read back and compared. Fixes are re-screenshotted until the section
is visually indistinguishable, then locked. A dev-only preview harness (`app/dev-preview/[slug]`,
404 in production) renders the token-gated flow pages with mock props so their forms can be shot.

## Page status

| Page | V7 reference | Status |
|---|---|---|
| Landing `/` | `iqcommune-main-landing-page.html` | Hero pixel-verified; full section sweep pending |
| **Practitioners `/practitioners`** | `iqcommune-empanelment.html` | ✅ **Complete — 12/12 sections cloned & locked** |
| Rate / Consent / Photos / Onboarding / Join-admin | flow mockups | Analysed (defects mapped); clone pending |
| Admin console | `admin-console-automated.html` | Chrome/tabs match; panels are documented reductions |

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

**Known intentional deviations:** dynamic copyright year (vs mockup's hardcoded 2025); both columns of
Division-of-work kept on mobile (V7 hides one — content-parity rule/test).
