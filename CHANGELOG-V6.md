# IQCommune — V6 Changelog

Running record of V6 work. Newest entries at top. One entry per shipped change: what broke or
changed, the root cause, the fix, and the runtime evidence.
Source-of-truth spec: `../client_requirements/completelyautomatedsetup (V6)/`.
V6 delivery scope: `../V6-FRESH-CLONE-MASTER.md`. Open items: `../PENDING-STATUS.md`.
Earlier work (V5 and before): `CHANGELOG-V5.md`.

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
