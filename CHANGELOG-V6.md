# IQCommune — V6 Changelog

Running record of V6 work. Newest entries at top. One entry per shipped change: what broke or
changed, the root cause, the fix, and the runtime evidence.
Source-of-truth spec: `../client_requirements/completelyautomatedsetup (V6)/`.
V6 delivery scope: `../V6-FRESH-CLONE-MASTER.md`. Open items: `../PENDING-STATUS.md`.
Earlier work (V5 and before): `CHANGELOG-V5.md`.

---

## [2026-07-21] Audit — site-wide container overflow, and the test that proves it

The Team & Access defect below is a class the suite could not see: `v6-responsive-full.spec.ts`
only checks whether content escapes the **viewport**, and it `console.log`s "FAIL" without ever
asserting — so a green run there is not evidence. Content escaping its own **card** while the page
stays 375px wide went unmeasured.

- New `tests/e2e/v6-container-overflow.spec.ts` — flags any box extending past the padding box of
  its nearest width-constrained ancestor when nothing in between scrolls (`overflow-x: auto|scroll`)
  or clips it (`hidden|clip`), and only against ancestors that read as a surface (border, own
  background, or radius) so ordinary flow isn't reported. It **asserts**, so a regression turns the
  suite red.
- **Detector validated against the known bug**, not just against green: re-setting the Team & Access
  wrapper to `overflow-x: visible` in the live page raises 12 offenders (`table overhangs div by
  350px` …); with the fix in place, 0. A pass now means something.

Result — 10 public routes x 10 admin tabs at 320 / 375 / 768 / 1440 / 640x320:
**0 container-level offenders, 0 viewport-level offenders, 0 body horizontal scroll.**
Modals re-checked at 320x700 and 640x320: all fit, first and last control reachable.

---

## [2026-07-21] Fix — Team & Access table overflowed its card on mobile

Audit of every console table at 320/375/640×320/1440 (CDP emulation): 10 of 11 tables scroll
correctly inside their card. One did not — **Settings → Team & Access** (`TeamAccessTable`) used
`overflowX: "visible"` on a 640px-min-width table, so on a phone the rows spilled past the card
border (P1 by the overflow/reachability rule). `visible` existed only so the "⋯" row menu wasn't
clipped.

- Wrapper → `overflowX: "auto"`; the row menu is now **portalled to `<body>`** as `position: fixed`,
  anchored to the trigger's rect (right offset measured off `documentElement.clientWidth`, not
  `innerWidth`, so the scrollbar doesn't skew it), and flips above the trigger + clamps into the
  viewport when it would overhang the bottom (landscape phones are ~320px tall).
- Menu closes on outside click, Escape, scroll (capture) and resize — a fixed menu would otherwise
  detach from its row. Clicking the trigger while open now actually closes it (the old
  mousedown-close + click-reopen race made it un-closable).
- Set-password / reveal-password panel moved out of the right-most Actions cell into its own
  full-width `colSpan` row, `position: sticky; left: 0` — it previously opened ~330px past the
  scroll edge, i.e. invisible on a phone.

Verified in the running app: table scrolls inside its card at 320/375; menu fits the viewport for
every row at 640×320; panel visible at scrollLeft 330; desktop 1440 unchanged (no scroll needed,
menu anchored ±0.3px); 0 console errors; `eslint app components` clean.

---

## [2026-07-21] Audit — Tools & Calculators, live-state parity with the V6 prototype

Ran the prototype from a local server alongside the app and read both widgets' rendered
output (`t1`–`t6` DOM ids vs `ToolsSection.tsx`), rather than only diffing static markup —
most of this section's text is generated at runtime and is invisible to a source diff.
All six seeds, every label, every insight sentence and the P/E verdict thresholds match.
Three deviations found, all three now resolved in favour of the prototype:

- **P/E Quick-Check dropped the whole-number case.** The prototype's `fmtN` prints `20×`
  when the ratio lands on an integer and `20.5×` otherwise; the app used `toFixed(1)`
  unconditionally, so it read **`20.0×`** in both the box and the sentence ("P/E of 20.0× is
  in line with market…"). Ported `fmtN`.
- **SIP Growth bars lost their tooltips.** The prototype sets `title="₹2.7L"` … on each of
  the 10 bars, so hovering reads the corpus at that year. The app rendered bare divs.
  Restored — the 10 titles now match the prototype's exactly.

- **Retirement Corpus showed different figures.** The app had been using a growing-annuity PV
  with all terms monthly; the prototype raises the *annual* rate ratio to a *monthly* exponent
  — `Math.pow(1.07/1.06, -240)` — then divides by 12. On the defaults that is **₹64.0L corpus
  / ₹2K SIP** (prototype) against **₹1.5Cr / ₹6K** (app). **Decision: match the prototype**
  (2026-07-21) — prototype-is-spec, and the published figures are the client's to set.
  Transcribed verbatim, with a comment at the formula recording that the units do not line up
  so nobody silently "fixes" it back and moves the published numbers.

  *On record, since it will come up again:* by the card's own assumptions — ₹71.5K/month of
  spending across a 20-year retirement window — ₹64.0L funds roughly 7 years, i.e. the formula
  under-states the target ~2.4×. Worth raising with the client as a spec-level question rather
  than settling it in code.

Kept **deliberately different**:

- **"an Aggressive profile".** The prototype interpolates `a ${label}` and renders "a
  Aggressive profile"; the app special-cases the article.

---

## [2026-07-21] Fix — landing-page copy drift vs the V6 prototype

Full text diff of the rendered landing page against
`../client_requirements/completelyautomatedsetup (V6)/iqcommune-main-landing-page.html`
(both stripped to visible text, then diffed). Three deviations were real; the rest is
computed calculator output, which matches the prototype's own JS.

- **Tools & Calculators → Portfolio Balance Scorecard** opened at the Conservative *target*
  allocation (30% equity / 55% debt), scoring a flat **10.0/10 — "Well-balanced…"**. The
  prototype opens slightly off-target (**40% / 45%**) so the card actually demonstrates the
  rebalancing cue: **6.0/10 — "Slightly off-target for Conservative. Target: ~30% equity,
  ~55% debt."** Seeded the sliders to the spec values (`ToolsSection.tsx`).
- **FAQ — organisational sessions** used curly quotes (`&ldquo;Request a Session&rdquo;`)
  where the spec has straight ones.
- **FAQ — module bundles** used single quotes (`'Request a Session'`) for the same phrase —
  inconsistent with the answer directly above it as well as with the spec.

Verified in the running app: the scorecard renders 40% / 45% / 6.0/10 with the off-target
line, and the profile chips still drive it (Moderate → 55/35, 10.0/10, "Well-balanced for a
Moderate profile"); both FAQ answers render `"Request a Session"`; 0 console errors;
`tsc` 0 errors in the touched files; `eslint` clean.

Deliberately **not** changed (intentional divergence from the static prototype, not drift):
dynamic `© <year>` vs the prototype's hard-coded 2025; the footer brand lockup + LinkedIn
link (`SiteFooter`); hero stat counters animating up from 0 via `CountUp`; the request /
photo-upload modals, which the prototype ships as always-present markup and the app mounts
on demand.

---

## [2026-07-21] Fix — "Why it matters" comparison table had a dead strip under the short column

The landing-page differentiator table (`app/(public)/page.tsx`) was built as two **independent**
column stacks, so each column sized its rows to its own content. The right column's last item wraps
to two lines (80px) while the left column's last item is one line (56px) — leaving a 24px strip that
belonged to the column wrapper, not to any row. Two visible symptoms, one root cause:

- the vertical divider between the columns stopped ~24px short of the table's bottom border;
- the `.row-hover` gold tint didn't cover the bottom of the **Learning ends with the classroom**
  cell — hovering that blank strip did nothing.

Flattened it into a single grid of cells (`them, us, them, us…`) on `.diff-grid-inner`, so paired
cells share a grid row and stretch to equal height; the hover target, the row rule and the divider
now all reach the cell's bottom edge. Cell styles extracted to `DIFF_HEADER_CELL` / `DIFF_ITEM_CELL`
/ `DIFF_DIVIDER` / `DIFF_ROW_RULE` so the two sides can't drift apart again. `.diff-col-them` moved
from the wrapper onto each left-hand cell, so the ≤768px `display: none` rule still hides that side.

Verified in the running app: at 1440 every pair reports identical top/bottom (last row 80px both
sides, bottom 1449 vs grid 1450 = the grid's own border), hover fills the full last cell; at 390 the
6 `diff-col-them` cells are hidden and the single column is flush with the bottom border; 0 console
errors; `tsc` 0 errors in this file; `eslint` clean.

Not changed (same latent defect, flagged): `app/(public)/practitioners/page.tsx` "You bring /
iqcommune handles" table uses the same two-independent-columns pattern.
