# IQCommune — V5 Changelog

Running record of V5 work. Newest entries at top. Group by date + V5 bucket.
Source-of-truth spec: `../client_requirements/pleaseusetheseonly (V5)/`. Full gap analysis: `V5-AUDIT.md`. Remediation plan: `V5-REMEDIATION-PLAN.md`.

---

## [2026-07-14] Auto-create payout on session completion + schema-bug fix — SHIPPED

Made the finance loop live: marking a session **Completed** now auto-creates its Pending payout
(plan: `../PAYOUT-AUTOCREATE-PLAN.md`). Previously the only creation trigger ("+ Create payout")
was gated off for V5-match, so the Payouts tab was always empty and mark-paid/revert/the
Sessions→Payouts link were never exercisable.

- Extracted the creation logic into one idempotent helper `lib/admin/create-payout.ts`
  (`createPayoutForSession`), used by both the manual route and the new completion hook.
- `sessions/[id]/status/route.ts`: on the Upcoming→Completed transition, best-effort call to the
  helper (status change never fails on a payout error; idempotent, so re-completion won't dupe).
- **Fixed a pre-existing schema bug** the gated route hid: the insert wrote a `tds_rate` column the
  remote `payouts` schema doesn't expose ("schema cache" error → 500). Dropped it — `net_amount`
  already carries the TDS-deducted value; the rate is derivable from the session.
- Verified live: completed IQC-SES-0005 (₹4,500) + 0006 (₹8,000) → both Pending payouts appear
  with correct invoice refs; Sessions row now shows **View payout** → jumps to Payouts; Mark-as-paid
  present; pending cards + sidebar badge populate. `tsc` + `eslint` clean; 0 console errors.

---

## [2026-07-14] V5 100% parity — role visibility, Activity export, zero badges — SHIPPED

Closed the last secondary gaps for full V5 mockup parity (plan: `../V5-100-PARITY-PLAN.md`).
Item "Requests venue-status line" was already implemented (`RequestTable.tsx:332`).

**Role visibility → V5 demo sidebar.** V5's role-switch hides only `.role-edit`/`.role-team`/
`.role-activity-nav`/`.role-override` for lower tiers, so every role sees all tabs except
Activity. Matched it: `buildSections`/`availableTabs` now give the read-only **User** the full
sidebar (Consent, Settings, Gallery included) view-only; `RolesPermissions` is visible to all
roles (was Global-only); Team & Access invite stays Global-only. Added `readOnly` to
`ConsentTable` (hides Copy link + Mark received; PDF download kept) and `GalleryManager` (hides
upload panel + Publish/move/Delete; view-only grid). Verified via "Viewing as: User" preview.

**Activity "Export log"** (V5:849). Added the header button (Global-Admin-only tab) wired to a
real CSV export that fetches the audit feed (`exportActivityLog`) — verified live (89-row CSV).
Also fixed a **pre-existing no-op**: Photos' "Export log" label never matched the `=== "Export"`
handler, and the read-only header filter dropped "Export log" — both now route/keep correctly.

**Zero-value sidebar badges** (V5). Badges render when the count is defined (incl. literal "0"),
matching the mockup (Photos/Payouts now show "0"). `tsc` + `eslint` clean; 0 console errors on
clean loads (one transient input-autofill hydration warning, not a regression).

---

## [2026-07-13] V5 role dropdown + Settings invite + payouts cross-link — SHIPPED

Closed three V5-parity gaps the client flagged (plan: `../V5-CLONE-IMPL-PLAN.md`).

**Role "Viewing as" switcher** (V5 nav dropdown). New global-admin-only, **downgrade-only**
preview control in the top nav (`AdminTopNav.tsx`) driven by `viewAs` in `AdminUIContext`.
`AdminConsoleView` derives effective `isGlobalAdmin`/`readOnly` from it, so a global admin
can preview the Admin and User scopes without leaving `/globaladmin`. Server permissions are
untouched — it can never grant more than the account already has. The 3 routes
(`/console` · `/globaladmin` · `/user`) still drive the real role at login. Layout passes the
real role → `AdminShell` → nav. Verified: Global/Admin/User previews each hide the right
controls (Team&Access, invite, Roles&Perms, Activity for Admin; edit + Settings/Consent for User).

**Settings inline invite block** (V5 §Team&Access). Extracted the invite flow into a shared
`InviteTeamMember.tsx` (DRY — replaces the duplicate block inside `CredentialsModal`), rendered
inline on the Settings panel. Role select now offers **User / Admin / Global Admin** per the
mockup (was Admin/User only). Global-Admin invites required unwinding two deliberate escalation
clamps (`invites/route.ts` `INVITE_ROLES`, `admin-accept/route.ts` role coercion) — done per
explicit client sign-off, with all mitigations kept (single-use, 7-day expiry, hashed token,
rate-limit, audit) plus a prominent amber warning shown when Global Admin is selected. (V5's
demo "Send email" stub omitted — a no-op button violates the functional-completeness bar.)

**Payouts cross-link fix.** The session→payout (and →photos) navigation actions in
`SessionTable.tsx` were dead (gated behind `SHOW_OFFSPEC_ACTIONS=false`). Un-gated the two
pure-navigation cross-links, and populated `payout_id` on session rows in `console-data.ts`
(session_id→payout map, zero extra query) so "View payout" renders whenever a payout exists.
Cross-tab navigation verified live (View photos jumps tabs); View payout is identical code,
data-gated. `tsc` + `eslint` clean; 0 console errors.

**Realtime channel-collision fix** (`lib/hooks/use-realtime-list.ts`). Surfaced by the invite
refactor: the inline Settings block and the credentials modal both subscribe to `admin_invites`,
and `useRealtimeChannel` used a per-table topic (`realtime:${table}`) — Supabase throws
"cannot add postgres_changes callbacks … after subscribe()" on the 2nd same-topic subscriber.
Made the topic unique per hook instance (`realtime:${table}:${seq}`) — a general fix for any
two components watching the same table. Verified: modal opens over the inline block, 0 errors.

---

## [2026-07-12] Fresh V5 audit + remediation of remaining gaps — SHIPPED

Re-audited the whole app against the V5 docs (5-lane parallel, findings in
`V5-FRESH-AUDIT.md`). All three original P1 blockers confirmed resolved. Fixed the
remaining actionable gaps:

**Tables → exact V5 column parity** (prior turn): Payouts/Agreements Actions header;
removed Rating/chevron (Practitioners), Issued (Confirmations), address/T-shirt
(Master Data) — matches handoff §141 scope.

**Practitioner Danger Zone** (`PractitionerTable.tsx`, `global/practitioners/[id]/route.ts`):
stage-gated Delete vs Deactivate (Delete only for Applied/Screening Done/Rejected;
Deactivate only for Agreement Sent/Empanelled) on client **and** server (409 otherwise);
Agreement Sent no longer hard-deletable. Dashed "Danger zone" border + heading. Revert
now confirms. Removed legacy `Under Review` from the client dropdown.

**Instant-undo (§3.1)** extended from soft-deletes to pipeline actions: Empanel, Reject
(→ lifecycle revert), Mark received (→ Awaiting), Mark paid (GA-only → Pending), and
**Assign** — backed by a new atomic, audited `POST session-requests/[id]/unassign`
(soft-deletes the fresh session + resets request to New, guarded to pre-consent state,
no client email). Undo link now underlined.

**Gallery** (`api/admin/gallery/route.ts`, `[id]/route.ts`): enforced `GAL_MAX=20` FIFO —
publishing past 20 unpublishes (never deletes) the oldest published photo.

**Payouts** header states the no-delete/revert policy. **Master Data** blurb + CSV export
aligned to the 5-field scope.

**Deliberately NOT changed:** invite `<select>` still excludes Global Admin (self-escalation
guard); per-field pencils deferred (bulk modal is functional-equivalent); photo-delete undo
deferred (hard delete + storage removal — needs a soft-delete/retention decision).

**Verification caveat:** `tsc` 0 + `eslint` clean on all changed files + console route
compiles + unassign route registered/gated. Authenticated console mutations not driven live
(no admin credentials) — spot-check once logged in. Migration `0032` required.

---

## [2026-07-11] V5 clone — full docs-driven sweep (console + public) — SHIPPED

Second, exhaustive pass driven by the V5 mockups **and** the handoff docs
(`iqcommune-admin-console-operating-procedure`, `-technical-handoff-v3`,
`landing-page-gallery-reference`). Cloned every remaining behavior, fallback,
empty-state, and per-field correction the docs specify. Commits on `v5/remediation`.

**Verification caveat (applies to all admin items below):** changes are
`tsc` (0 errors) + `eslint` clean + route/preview-verified + code-reviewed against
the real endpoints. The authenticated console mutations (pencil→PATCH, undo→restore,
Void/Revert, deactivate/revert) were **not driven live** (no admin credentials) —
spot-check once logged in. Migration `0032` must be applied for P1-3.

### Public pages
- **Empanelment application form** reordered to the mockup order ("About you": …→
  City/State → Communication address → T-shirt), relabelled (City "…you're based in",
  "T-shirt size", address "(include PIN code)" + updated hint/placeholder); `organisation`
  + PAN/GST kept as an intentional superset. `Field` label now accepts `ReactNode`. (`ad0aedf`)
- **Landing gallery caption** corrected to the mockup design — a full-sentence caption as a
  **top-left translucent badge** + a **faint bottom-right city**, shown over placeholders
  too; placeholder captions are full sentences; admin preview mirrors it. (`ad0aedf`)

### Session Consent card (`df941f1`, `e2ce10e`, `2eb836c`)
- **Inline** "Generate a new confirmation" card (title + subtitle verbatim), not a modal;
  header "+Generate" button removed.
- **V5 layout order**: filter bar (PendingBar, standalone) → generate card → confirmations
  table (`ConsentTable` gained a `beforeTable` slot; `PendingBar` a `standalone` variant).
- **Progressive reveal**: only the session picker shows until a session is picked; Start
  time / Duration / Gross / TDS / GST / net / submit appear after (mockup `conf-auto-wrap`).
- **Per-field Global-Admin pencil** on every auto-populated field → PATCHes the underlying
  record permanently (`sessions`: module/date/venue/audience/participants; `session_requests`:
  city/state/SPOC; `practitioners`: first name/payment). Agreement ref + invoice-by read-only.
  Autofill payload now carries session/request/practitioner ids + raw date.
- **Discrete Void / Revert / Mark-received** row actions replacing the Global-Admin status
  dropdown (status shows as a pill); backend `/api/admin/global/consent/[id]` unchanged.

### Session Requests (`6e732d1`)
- **Per-field Global-Admin pencil** on the expanded request — SPOC name, org, city, state,
  topic, audience, group size, min commitment, venue — each PATCHes the request record.

### Pipeline actions, empty-states & fallbacks (`2eb836c`, `9d92c3b`)
- Pipeline-action audit: Requests/Sessions/Photos already match V5 (supersets); the only gap
  (Consent Void/Revert) is now closed.
- **All V5 empty-states matched verbatim**: Gallery "Nothing published yet" + sub-line;
  Photos "No completed sessions yet" + sub-line (`AdminTable.emptyText` now `ReactNode`);
  Confirmations "No confirmations generated yet" + sub-line; Practitioners "No practitioners
  match this filter."
- **Field fallbacks matched**: practitioner State → "—" (not "Not provided"); Address →
  "Not provided — collected on newer applications"; request Venue → "Not specified — pending
  from SPOC". Photos header "Session" → "Session ref."

### Instant-undo toast (`d60986b`)
- New shared `useUndoToast` (act-then-undo, ~9s): deletes run immediately (soft) and offer
  **Undo** → restore via `POST /api/admin/global/trash`. Replaces the confirm-then-delete
  dialogs on the trash-backed entities — **Session Requests, Practitioners, Sessions,
  Agreements** (dead `ConfirmDialog` wiring removed from Session/Agreement). Payout delete was
  already removed (P2-7); Photos/Gallery deletes aren't trash-backed, left as-is.

### PendingBar toolbar rollout (`2fc6161`)
- Migrated the 5 remaining tables (Practitioner/Session/Agreement/Photos/Consent) from the
  legacy `TableFilterBar` to the V5 `PendingBar` (clickable pending stat-buttons + period
  filter), matching the committed RequestTable reference; Photos gets two cards (Pending +
  Expiring ≤7d). Search boxes dropped per the V5 design.

> **Not touched:** `PayoutTable.tsx` — a parallel work-stream's in-progress PendingBar/undo
> migration; deliberately left to that stream to avoid clobbering.

---

## [2026-07-11] V5 remediation sweep — all P1 blockers + most P2/P3 — SHIPPED

Closed the outstanding `V5-AUDIT.md` gaps across four waves. **All three P1 sign-off
blockers are now resolved.** Commits on `v5/remediation`.

**P1 — sign-off blockers**
- **P1-1** operator-settable session status — *(pre-existing on branch, `9cc9977`)*.
- **P1-2** cancel a Confirmed booking: new `session-requests/[id]/cancel` route cascades
  request + linked session to Cancelled, audits, and auto-sends a new
  `sessionCancelledEmail` to the client (closes **P2-4**). Hard-delete stage-gated to
  `New`-only (**P2-3**). (`RequestTable`, `templates.ts`)
- **P1-3** practitioner reversibility: migration **`0032`** (widen status CHECK to allow
  `Deactivated`; add `prev_status` / `prev_active_status`), lifecycle route
  (deactivate/reactivate/revert), Empanel/Reject now record `prev_status`, hard-delete of
  an Empanelled practitioner is blocked (deactivate instead), and a 3-state Danger Zone UI
  + `Deactivated` status pill / filter. **Requires `0032` to be applied.**

**P2 / P3**
- **P2-2** payment fields (UPI / invoice name / account / IFSC) now correctable, **re-encrypted
  server-side** on PATCH (fixed a plaintext-at-rest bug); full Payment block + State on profile.
- **P2-5 / P3-2** gallery: gold topic-pill → free-text **caption banner** (existing columns; no migration).
- **P2-7** payouts: **removed delete entirely** (Revert-only; DELETE route now 405) + the
  "record correction only — does not reverse the bank transfer" notice on the revert.
- **P3-3** invites now choose **Admin or read-only User** (never global_admin via link).
- **P3-5** T-shirt list reconciled to V5 `XS…3XL`; **family-billing validation** now enforced
  (was unenforced) on the apply form. `/join-admin` re-skinned to V5.

**Decisions**
- **P2-6 — gallery cap: KEEP UNCAPPED (deliberate).** Client chose to keep the admin-managed
  uncapped carousel over the spec's 20-photo/FIFO cap. Not a gap — an accepted deviation.

**Deferred (coordinated follow-ups, not silent drops)**
- **P2-8 / P3-1 — instant-undo toast:** cross-cutting change touching the shared admin table
  toasts; **mitigated today** by soft-delete + trash-restore (no data loss). Deferred to avoid
  clobbering concurrent work in the same tables; do as a single shared-toast pass.
- **P3-4 — pending stat cards (`PendingBar`):** handled in a parallel work-stream (`3cf974e`).

---

## [2026-07-11] P2-1 + P2-2 · Practitioner Address / T-shirt display + edit — SHIPPED

Surfaced the V5 welcome-kit intake fields on the practitioner profile and made the
plain-text correction fields editable by Global Admin.

**What changed**
- **Display (P2-1):** profile expand now shows **Communication address** and **T-shirt size**,
  with a **"Not provided"** fallback for legacy records (real data state, not a bug).
  (`components/admin/PractitionerTable.tsx`)
- **Edit (P2-2):** the Global-Admin edit modal gained **State**, **Communication address (with
  PIN code)**, and **T-shirt size** (select reusing `TSHIRT_SIZES` from the application schema).
  Shown in edit mode only — these are correction fields for existing records.
  (`components/admin/PractitionerFormModal.tsx`)
- PATCH `global/practitioners/[id]` schema extended with `state`, `communication_address`,
  `tshirt_size` (still `.strict()`; payment/bank columns stay blocked).

**Scoping note — Payment method / Invoice name intentionally deferred.** The other two fields
the spec lists as pencil-correctable are **encrypted payment-vault columns** the PATCH route
deliberately blocks. Editing them safely requires the encryption path (`practitioner-payment`),
a distinct risk class — tracked as a P2-2 follow-up rather than forced in here. Not a silent drop.

**Verified (runtime, real Supabase):** as Global Admin, opened Ayaan Verma (legacy record showing
"Not provided") → edit → set address + T-shirt L → **DB persisted** (`communication_address`,
`tshirt_size='L'`) → profile re-render showed both after full reload → reverted seed data.
tsc clean; eslint unchanged (one pre-existing `set-state-in-effect` warning in PractitionerTable
is untouched).

*Files:* `components/admin/PractitionerTable.tsx`, `components/admin/PractitionerFormModal.tsx`,
`app/api/admin/global/practitioners/[id]/route.ts`.

---

## [2026-07-11] P2-9 + P2-10 · Sidebar 4-group regroup + "Session Details" label — SHIPPED

Brought the admin sidebar and the Sessions tab label into line with V5 technical-handoff §1.

**What changed** (`components/admin/AdminConsoleView.tsx`)
- Sidebar regrouped from 3 sections into the spec's **4**: Practitioner Management
  (Practitioners, Agreements) · Session Pipeline (Session Requests, Session Consent,
  Session Details, Photos) · Finance (Payouts) · System (Activity [GA-only], Settings, Gallery).
  **Session Consent moved back** from Finance → Session Pipeline where it belongs.
- Sessions tab **relabeled "Session Details"** in the sidebar and the page header
  (`TAB_META.sessions.title`); the internal tab id stays `sessions` (function names/vars
  unchanged), exactly as the spec specifies.
- Read-only User tier: shows the first three groups (Consent hidden as a mutation surface),
  no System section — unchanged behavior, new grouping.
- `GlobalSearchResults` session section title → "Session Details" for consistency.

**Verified (runtime):** console sidebar renders the 4 groups in order; sidebar item and
`<h1>` both read "Session Details". tsc clean; eslint unchanged (the one pre-existing
`Date.now()`-in-render error in AdminConsoleView is untouched and not from this change).

*Files:* `components/admin/AdminConsoleView.tsx`, `components/admin/GlobalSearchResults.tsx`.

---

## [2026-07-11] P1-1 · Session status setter — SHIPPED

Sessions can now be moved through Upcoming → Completed → Cancelled by any console
operator (Admin+), closing the P1 that left the Photos & Payouts back-half unreachable.

**What changed**
- New `StatusSelect` — a token-tinted, pill-shaped `<select>` sibling of `StatusPill`,
  built from the same status color map so an editable status cell reads identically to a
  static one; `stopPropagation` keeps the dropdown from toggling the row's expand click.
  (`components/shared/StatusPill.tsx`)
- `SessionTable` Status column: static `StatusPill` for the read-only User tier, inline
  `StatusSelect` (Upcoming/Completed/Cancelled) for operators — optimistic update with
  revert + error toast on failure. (`components/admin/SessionTable.tsx`)
- New route `PATCH /api/admin/sessions/[id]/status` — `requireAdmin`-gated, enum-validated,
  audit-logged via `logActivity`, mirrors the practitioner-status route.
- Parent wiring: `onStatusChange` optimistically patches `sessionsData`. (`AdminConsoleView.tsx`)

**Verified (runtime, real Supabase):** logged into the console, changed IQC-SES-0005 →
Completed → **persisted across a full reload** → session **appeared in Photos** as "Pending";
reverted → Upcoming (test data restored). tsc + eslint (color guard) clean. UI/UX matches the
existing pill language. `Functional completeness: 1 control — wired+exercised · 0 inert — evidence:
driven in browser + DB re-read — VERDICT: PASS`.

*Files:* `components/shared/StatusPill.tsx`, `components/admin/SessionTable.tsx`,
`components/admin/AdminConsoleView.tsx`, `app/api/admin/sessions/[id]/status/route.ts`.

---

## [2026-07-11] V5 Remediation Backlog — PLANNED (not yet implemented)

Actionable gaps from the V5 spec-vs-code audit (`V5-AUDIT.md`) that have an **unambiguous fix
direction — no client decision required**. Ordered by remediation priority. Each item names the
exact files it will touch. Status: ⬜ not started.

### P1 — blocks V5 sign-off

- ✅ **P1-1 · Session status setter** — SHIPPED 2026-07-11 (see entry above). Operator-settable
  Upcoming/Completed/Cancelled dropdown via new `StatusSelect` + `PATCH /api/admin/sessions/[id]/status`.
  Verified end-to-end: Completed persists and unlocks Photos.

- ⬜ **P1-2 · Cancel-a-Confirmed-request flow.** Add a Cancel action on Confirmed requests that sets
  **both** request and linked session to `Cancelled` and auto-opens the client cancellation draft.
  *Files:* `components/admin/RequestTable.tsx`, `app/api/admin/global/requests/[id]/route.ts`,
  `lib/email/templates.ts` (new `cancel-session` template — see P2-4), `components/admin/ContactDraftModal.tsx`.

- ⬜ **P1-3 · Practitioner Deactivate / Reactivate / Revert + 3-state Danger Zone.** Largest item.
  Migration adds `Deactivated` to the status enum + `prev_status` / `prev_active_status` columns;
  new deactivate/reactivate/revert routes; stage-gated Danger Zone (hard-delete only for Applied/
  Screening Done/Rejected, Deactivate for Agreement Sent/Empanelled, Revert after Empanel/Reject).
  *Files:* new `supabase/migrations/0032_practitioner_lifecycle.sql`,
  `app/api/admin/global/practitioners/[id]/route.ts` (+ deactivate/reactivate/revert),
  `components/admin/PractitionerTable.tsx`, `lib/supabase/database.types.ts`,
  practitioner status enums in `app/api/admin/practitioners/**`.

### P2 — fix before release

- ✅ **P2-1 · Surface Address + T-shirt on practitioner profile** — SHIPPED 2026-07-11 (see entry above).
- 🟡 **P2-2 · Extend editable practitioner fields** — PARTIAL, SHIPPED 2026-07-11. State + Communication
  address + T-shirt now editable (Global Admin). **Payment method + Invoice name deferred** — encrypted
  payment-vault columns; editing needs the encryption path (`practitioner-payment`), tracked separately.
- ⬜ **P2-3 · Stage-gate Request delete** — hard-delete only while `New`; replaced by Cancel once
  `Confirmed` (folds into P1-2). *Files:* `components/admin/RequestTable.tsx`.
- ⬜ **P2-4 · Add `cancel-session` email template** (part of P1-2). *Files:* `lib/email/templates.ts`.
- ⬜ **P2-5 · Gallery caption-banner model.** Replace the legacy gold topic-**pill** with a free-text
  **caption** (full sentence) on both admin capture and landing render; keep city bottom-right.
  Includes **P3-2** (landing renders caption as a banner, not a pill).
  *Files:* `components/admin/GalleryManager.tsx`, `components/public/GallerySection.tsx`,
  new migration renaming/adding the caption column (from `caption_top_left`), `app/api/admin/gallery/**`,
  `app/api/gallery/route.ts`.
- ⬜ **P2-8 · Instant-undo toast.** Shared toast that accepts an undo fn, shows a gold "Undo" link,
  stays ~9s, single global hide-timer; wired into assign, empanel, reject, mark-consent-received,
  mark-paid, delete-photo. Includes **P3-1** (photo delete → undo instead of confirm dialog).
  *Files:* new shared toast in `components/admin/AdminUIContext.tsx`, call sites in
  `RequestTable.tsx` / `PractitionerTable.tsx` / `ConsentTable.tsx` / `PayoutTable.tsx` / `PhotosTable.tsx`.
- ✅ **P2-9 · Sidebar 4-group regroup** — SHIPPED 2026-07-11 (see entry above).
- ✅ **P2-10 · Rename Sessions tab label to "Session Details"** — SHIPPED 2026-07-11 (see entry above).

### P3 — cosmetic / low-risk

- ⬜ **P3-5 · T-shirt size list** — add `XS` and rename `XXXL`→`3XL` to match the prototype's 7-size list.
  *Files:* `lib/schemas/application.ts`, `components/public/ApplicationForm.tsx`, new migration updating
  the `tshirt_size` CHECK constraint.
- (P3-1 folded into P2-8; P3-2 folded into P2-5.)

### Excluded from this list

- **Client decision required:** P2-6 (enforce 20-photo FIFO cap?), P2-7 (enforce spec's "no payout
  delete, ever" vs keep the app's safer soft-delete?).
- **Possibly intentional — confirm intent, not clearly a defect:** P3-3 (invite form has no role select —
  role decoupled to create-account form + per-row dropdown), P3-4 (pending stat cards replaced by a
  filter-chip bar per an explicit code comment).
- **Not gaps — app already exceeds spec (do NOT change):** gallery→landing integration (shared table +
  realtime), server-side authz, self-service auto-activating invite accounts, 17-route audit log, HMAC
  consent links, soft-delete + 30-day recovery. See `V5-AUDIT.md` §EXCEEDS.
