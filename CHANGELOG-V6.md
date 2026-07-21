# IQCommune — V6 Changelog

Running record of V6 work. Newest entries at top. One entry per shipped change: what broke or
changed, the root cause, the fix, and the runtime evidence.
Source-of-truth spec: `../client_requirements/completelyautomatedsetup (V6)/`.
V6 delivery scope: `../V6-FRESH-CLONE-MASTER.md`. Open items: `../PENDING-STATUS.md`.
Earlier work (V5 and before): `CHANGELOG-V5.md`.

---

## [2026-07-21] Fix — the comparison table lost half the comparison on a phone

Found by strengthening the parity test rather than by looking. The first version compared
only interactive labels and headings, so when the /practitioners perks card was re-hidden to
validate it, the single thing it could name was the "Show more" button — it had caught that
card by luck, because the card happened to contain a control. A hidden block of pure copy
would have passed silently, which is the exact defect the file exists to catch.

`collect()` now also compares **visible prose** (elements carrying their own text, >=15 chars,
so a section counts once rather than at every wrapper level) and **image alt text**. Proof the
strengthening worked: re-hiding the perks card used to report 1 signal; it now reports 10,
naming the perk copy itself.

That immediately surfaced a real one on the landing page: `.diff-col-them { display: none }`
below 720px deleted the **entire "Conventional Trainers" column** — a comparison table with
one side removed is not a comparison, it is a list of claims. Both columns now stay on a
phone with tighter padding and 12.5px type; paired cells still share a grid row (verified
aligned at 320 and 375, desktop untouched at 28px/14px).

Two exclusions, both narrow and reasoned: gallery paging dots (count tracks fetched data,
not viewport) and the header brand strapline (decoration inside the logo lockup, hidden
below 600px precisely to stop the header overflowing — which was itself a P1). Scoped to
exact strings so any other hidden copy still fails.

Sweep: 5 public routes + 10 admin tabs, 0 differences under the stricter comparison.

---

## [2026-07-21] Fix — two things desktop showed that a phone did not

Responsive design relocates content; it never deletes it. Nothing enforced that, so two
affordances were being hidden on a phone with nowhere else to go. New
`tests/e2e/v6-content-parity.spec.ts` diffs the visible interactive labels + headings at
1440 against 375 (with the hamburger drawer opened first, so relocated actions count as
present) and asserts the difference is empty.

- **/practitioners — the entire "What this means for you" perks card** was
  `display: none !important` below 720px. Six perks, the whole pitch a practitioner reads
  before applying, gone on phones. It now stacks under the CTA at 1.5rem padding.
- **Console "Viewing as" switcher** was hidden below 768px and existed nowhere else, so a
  global admin who previewed as User on a phone had no control left to switch back with.
  Extracted to `ViewAsSelect` and rendered twice — top nav on desktop, sidebar drawer on a
  phone — with CSS guaranteeing exactly one is visible at any width.

Third finding was a test bug, not an app bug: the home gallery renders 7 placeholder slides
until `/api/gallery` resolves to its 1 real photo, so "Go to slide 2-7" looked desktop-only.
The dot count tracks fetched data, not viewport, so it is excluded by name; "Previous slide",
"Next slide" and swipe are still compared.

Detector validated against the bug, not just against green: re-adding `display: none` to the
perks card turns the suite red again. Sweep: 5 public routes + 10 admin tabs, 0 differences.

---

## [2026-07-21] Fix — switching console tabs kept the old scroll position

Tabs swap the page content but not the scroll position, so switching while scrolled left the
new tab's heading above the fold: from y=180 on Session Requests, Session Details rendered
with its h2 at **-96px**. You landed on a page whose title you could not see.

`setActiveTab` now scrolls to the top, but only when the tab actually changes — re-clicking
the tab you are already on keeps your place (verified: y=120 held). Opt-in motion, so the
glide runs only under `prefers-reduced-motion: no-preference`.

Verified at 375 and 1440: 180 -> 0 with the heading at +84, and 55 -> 0.

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

## [2026-07-21] Fix — footer practitioner-CTA hover didn't match the prototype

`Teach what you practise — join the iqcommune practitioner network` hovered to plain
`--gold` (#c9982a) and left its underline flat. The prototype's inline `onmouseover`
brightens the text to `#f0c84a` **and** strengthens the gold rule to `rgba(201,152,42,0.8)`
— on an ink footer, plain gold reads muddy, which is why the prototype uses the brighter
value there.

- `.link-arrow:hover` → `--gold-on-ink` + `--gold-rule-strong`, with `border-bottom-color`
  added to the transition so the rule fades rather than snaps.
- New tokens `--gold-rule` / `--gold-rule-strong` (0.35 / 0.80 gold) replace the hand-typed
  `rgba(201,152,42,0.35)` on the link.
- **`!important` is load-bearing here, not lazy.** The link declares its resting colour and
  border inline, and an inline declaration outranks any class rule without it — the first
  attempt (colours in CSS, inline props removed) is the "correct" fix but silently dropped
  the underline while the dev server served a stale bundle. Matches the existing
  `.row-hover` precedent in this file.

Verified on hover in the running app: `rgb(240,200,74)` text, `rgba(201,152,42,0.8)` rule,
chevron nudge intact; resting state unchanged at `rgba(255,255,255,0.65)` + 0.35 gold rule.

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
