# IQCommune — V6 Changelog

Running record of V6 work. Newest entries at top. One entry per shipped change: what broke or
changed, the root cause, the fix, and the runtime evidence.
Source-of-truth spec: `../client_requirements/completelyautomatedsetup (V6)/`.
V6 delivery scope: `../V6-FRESH-CLONE-MASTER.md`. Open items: `../PENDING-STATUS.md`.
Earlier work (V5 and before): `CHANGELOG-V5.md`.

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
