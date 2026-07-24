# Console backend-outage resilience

## Question

When Supabase is unreachable, the console currently collapses to one line of
text (`app/error.tsx`'s generic `ErrorNotice`) instead of staying usable. The
user wants three things:
1. The console UI keeps rendering as normal during a backend outage — no
   full-page collapse.
2. Last-known-good panel data is cached client-side (IndexedDB) so a failed
   read still has something to show, and the raw storage isn't plainly
   readable to someone poking at DevTools (obfuscation, not encryption —
   flagged honestly, not oversold).
3. A slim status card at the top of the header appears when the backend is
   having trouble, telling the (admin) user this is a known site issue being
   fixed, not something they broke.

## Root cause (confirmed by reading the code)

- `features/console/requireRole.ts:24-25` calls `supabase.auth.getUser()`
  unguarded. A total Supabase outage throws there, uncaught, and Next.js
  swaps the whole route for `app/error.tsx` → the one-line collapse.
- `features/console/panels/loadPanels.tsx:69-84` already catches every table
  read per-panel and renders `PanelError` in place of just that one panel —
  this part is already resilient and is being extended, not fixed.

## Answer — chosen design

Two independent subsystems, no shared files, composed only through two typed
contracts:

**Contract 1** — `loadConsolePanels()` gains `failedTabs: readonly string[]`
on its return value (tab ids whose read threw). `ConsoleShell` gains an
optional prop `failedTabs?: readonly string[]` and renders a slim amber
strip above the sticky header (reusing the existing `flag-warn` /
`flag-warn-edge` / `gold-dark` tokens already used by `PanelError`) when
non-empty. Copy: *"We're having a technical issue on our end — our team is
already fixing it. You can keep working; some data may be a little out of
date until it's resolved."*

**Contract 2** — `requireRole()` throws a new exported `BackendUnavailableError`
specifically when the auth check itself is unreachable (network/connectivity),
as distinct from a legitimate "no session" (`redirect("/login")`, unchanged).
Each console route wraps its body in try/catch: catch `BackendUnavailableError`
→ render `<ConsoleUnavailable />` (branded, auto-retrying); rethrow anything
else so real bugs still hit the normal error boundary.

**Security note, deliberate:** the auth check is never bypassed. If Supabase
auth can't be verified, we do not fabricate a role or show real admin data —
we show a distinct "reconnecting" screen, not the console. Caching only
applies to the read-only table data *after* a session is already verified,
which is the case the user actually described ("if database is failed").

**Cache honesty:** `lib/consoleCache.ts` uses IndexedDB with values packed
through a trivial XOR+base64 encode — this defeats a casual glance at the
Application panel (no readable `{name, email}` tree), it is not encryption,
and the code says so in one comment. No TTL: cached rows are shown until a
fresh read succeeds (an admin console is not a place to blank out data on a
timer mid-outage).

## Implementation — two disjoint lanes, dispatched in parallel

**Lane A — auth resilience** (owns: `features/console/requireRole.ts`,
new `features/console/ConsoleUnavailable.tsx`, `app/console/page.tsx`,
`app/user/page.tsx`, `app/globaladmin/page.tsx`, plus new test files for
each). Does not touch any Lane B file.

**Lane B — cached data + banner** (owns: new `lib/consoleCache.ts`, new
`features/console/panels/renderers.tsx`, new
`features/console/panels/CachedPanel.tsx`, edits to
`features/console/panels/loadPanels.tsx` and `features/console/ConsoleShell.tsx`,
plus new test files). Does not touch any Lane A file. Adds `fake-indexeddb`
as a devDependency for the cache module's tests.

Parent (me) integrates: runs `pnpm typecheck && pnpm lint && pnpm test`
after both lanes land, resolves the two-line page.tsx touch-point (passing
`failedTabs` through — trivial, Lane A owns the actual page.tsx edits and is
told the exact field name up front), then runs a code-review pass.
