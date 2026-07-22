# Plan — make the console's global search real

## Question (restated intent)

The console header's search box accepts typing and does nothing. Make it work.

V7 is no help as a reference here: `globalSearch()` at line 2415 of
`iqcommune-admin-console-automated.html` is
`showToast('Searching for "'+q+'"…')` — a stub. So this is the same situation as
the notification bell: the prototype declares the control's *intent* and never
implements it, and cloning the stub would ship a search box that lies. The
placeholder text states the scope precisely — "Search across practitioners,
sessions, requests…" — so that is the contract to build against.

## Answer (chosen approach)

**Server-built index, client-side matching, jump-to-row on select.**

- The index is built in `loadConsolePanels` from the rows it has **already
  fetched** to render the panels. No new queries, no new API route, and it is
  role-scoped for free: a role that cannot load a panel contributes no hits from
  it, so search can never surface a record the viewer is not allowed to see.
- Matching is client-side over a precomputed lowercase haystack. The console
  already ships every row to the browser; a network round-trip per keystroke
  would be slower and would add an endpoint needing its own authz and rate
  limit for data the page already holds.
- Selecting a hit opens the tab, clears that panel's filters, expands the row
  and scrolls to it. Anything less — jumping to a tab and leaving the operator
  to find the row — is the half-measure that makes search not worth using.

**Scale cliff (documented, not hidden):** this is linear over rows held in
memory. At the current scale (hundreds) it is instant. Past ~5,000 rows the
index should move behind a server endpoint with a trigram index. Recorded in
`search.ts` so the next person meets the limit before the limit meets them.

**Scope:** the four row-based panels — Practitioners, Agreements, Requests,
Sessions. That is the placeholder's stated scope plus Agreements, which is the
same shape. Gallery/Settings/Activity are not row-detail panels; they are
excluded rather than faked.

**Why context, not a URL param, for the row target:** the tab already lives in
the URL via `history.replaceState`. Reusing the URL for the row would make the
jump depend on `replaceState` propagating into `useSearchParams`, which is
framework behaviour I would have to verify and which buys shareability nobody
asked for. Context is direct and cannot silently stop working.

## Implementation (lanes — files each lane owns)

Serial, single-threaded: lanes 2–5 all depend on the types in lane 1, and
lanes 4/5 touch shared components. No parallel dispatch.

| # | Lane | Files owned |
|---|------|-------------|
| 1 | Index + matcher + focus context | `features/console/search.ts` (new) |
| 2 | Build the index from already-read rows | `features/console/panels/loadPanels.tsx` |
| 3 | The combobox itself (used twice: header + mobile drawer) | `features/console/ConsoleSearch.tsx` (new) |
| 4 | Wire shell: accept index, render search, own focus state | `features/console/ConsoleShell.tsx` |
| 5 | Consume focus: clear filters, expand + scroll the row | `features/console/FilterablePanel.tsx`, `features/console/ExpandableRows.tsx` |
| 6 | Pass the index through every console route | `app/globaladmin/page.tsx`, `app/console/page.tsx`, `app/user/page.tsx`, `app/console-preview/page.tsx` |
| 7 | Tests | `tests/unit/console-search.test.ts` (new) |

## Verification

- Unit: matching (case, partial, multi-field, no-match), role scoping, cap.
- Live: type a practitioner's name in a real logged-in console, select the hit,
  confirm the tab opens, the filter clears, the row is expanded and in view.
- Keyboard only: ↓ ↑ Enter Esc, no mouse.
- `pnpm verify`, plus the responsive/scroll/roles audits since the header changes.
