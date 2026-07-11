# IQCommune — V5 Spec vs Live Code Audit

**Date:** 2026-07-11 · **Auditor:** 5-lane parallel audit, findings verified against source
**V5 source of truth:** `../client_requirements/pleaseusetheseonly (V5)/` (4 HTML prototypes + 3 handoff docs, docx→md via markitdown)
**Code audited:** `iqcommune/` @ `main` (commit `9e35b8e`)

> **Framing.** The live app is a real **Next.js + Supabase** application with server-side auth, audit logging, email, and soft-delete recovery — it is *not* a port of the static in-memory prototype. Many prototype "limitations" (no backend, CSS-only role gating, manual "Mark active" bridges) are things the real app **solves**, and those are called out as **EXCEEDS** rather than gaps. Gaps below are genuine behavioral divergences from the V5 spec.

---

## Scorecard

| Lane | Area | ✅ | ⚠️ | ❌ | Top severity |
|---|---|---|---|---|---|
| A | Practitioner lifecycle & Danger Zone | 1 | 3 | 6 | **P1** |
| B | Session pipeline (Requests/Sessions/Consent) | 8 | 0 | 5 | **P1** |
| C | Gallery / Photos / Payouts / Landing | 6 | 4 | 1 | P2 |
| D | Team invite / Activity / Undo / Filters | 6 | 3 | 2 | P2 |
| E | Empanelment form / Sidebar / Labels | 6 | 2 | 2 | P2 |

**Verdict:** Core data model, consent pipeline, gallery→landing wiring, and invite/account flow are **solid and often exceed the spec**. But two operator-facing flows are **broken/missing (P1)** and must be fixed before V5 sign-off: **(1) no way to mark a session Completed/Cancelled**, and **(2) the entire practitioner Deactivate/Reactivate/Revert reversibility system is absent.**

---

## P1 — Block V5 sign-off (core flow missing or broken)

### P1-1 · Sessions cannot be marked Completed or Cancelled — breaks Photos → Payouts
Nothing in the UI sets a session's `status`. `SessionFormModal.tsx:166` passes the existing status through unchanged; `SessionTable`/`RowActionsMenu` expose no status setter; the only references to `"Completed"` in the codebase are **guards** (`create-payout/route.ts:28`, `feedback/route.ts:85`, `photo-link/route.ts:29`). `global/sessions/[id]/route.ts:27` accepts a `status` field but no client ever sends it.
**Impact:** sessions are permanently stuck at `Upcoming`. Because Photos rows derive from *Completed* sessions and Payouts require *Completed*, **Operating Procedure Phases 4→5→6 are unreachable** — the Photos and Payouts tabs never populate through the normal flow.
**Fix (small):** add a Status dropdown (Upcoming/Completed/Cancelled) to `SessionTable` (or `SessionFormModal`) that PATCHes the already-accepting `global/sessions/[id]` route. The entire downstream consequence chain is already wired and DB-guarded — this is the one missing control.
**Verify live:** mark a session Completed → confirm it appears in Photos as "Pending from practitioner" and becomes payout-eligible.

### P1-2 · No "Cancel this session" flow for a Confirmed request (+ no cancellation notice)
Spec (`cancelRequest`) requires: a Confirmed request can be cancelled, which sets **both** the request and its linked session to `Cancelled` and auto-opens a `cancel-session` draft message to the client. In the app: a Confirmed request is read-only with **only** a Global-Admin soft-delete as an exit (`RequestTable.tsx:401-404,460-487`); there is no cancel control, no request→session cascade, and **no `cancel-session` email template exists** (`lib/email/templates.ts` — 0 hits). The `Cancelled` request status itself *does* exist (`0029_request_statuses_v4.sql`).
**Impact:** the deliberate "Cancel + notify the client" path from Fixing Mistakes is missing; cancelling a confirmed booking has no supported, client-notifying route.
**Fix:** add a `cancel-session` template + a Cancel action on Confirmed requests that cascades to the session and opens the draft modal.

### P1-3 · Practitioner reversibility & escalation system entirely absent
The whole V5 §3/§5 layer was never built. Verified missing in DB and UI:
- **No `Deactivated` status** — the DB CHECK (`0001_schema.sql:27`) omits it; inserting it would be rejected. No `prev_status` / `prev_active_status` columns exist (`database.types.ts`, migrations — 0 hits).
- **No Deactivate / Reactivate** — `PractitionerTable.tsx:521-550` shows a single "Delete practitioner" button for **every** status. A Global Admin can delete an **Empanelled** practitioner with agreement/session history — exactly the case §3.3 says must be blocked and downgraded to Deactivate. *(Mitigated:* it's a soft-delete with 30-day recovery, safer than the prototype's hard `splice()` — but wrong verb/semantics and doesn't preserve an active-history record.)*
- **No `revertPractitionerStatus`** — Empanel/Reject are one-way once the toast clears (a practitioner-status revert; the consent revert at `global/consent/[id]` is a different record type).
- **No 3-state Danger Zone** — the conditional Deactivated→Reactivate / normal→dropdown+danger / prevStatus→Revert structure doesn't exist.
**Fix (larger):** migration adding `Deactivated` to the enum + `prev_status`/`prev_active_status` columns; deactivate/reactivate/revert routes; stage-gated Danger Zone UI. This is the biggest build item in the audit.

---

## P2 — Fix before release (partial / contradicts spec)

| ID | Finding | Lane | Evidence |
|---|---|---|---|
| P2-1 | **Address + T-shirt not shown on practitioner profile.** Columns migrated (`0030`) but profile expand (`PractitionerTable.tsx:366-375`) omits them; no pencil, no "Not provided" fallback. | A | data layer done, UI unwired |
| P2-2 | **Per-field pencil correction partial.** Single edit-all modal instead of per-field pencils; **State, Communication address, T-shirt, Payment method, Invoice name are not editable** (`PractitionerFormModal.tsx:63-93`). | A | 5 of 7 spec'd correctable fields missing |
| P2-3 | **Request Delete not stage-gated.** "Delete request" offered at every status incl. Confirmed, Global-Admin only — spec wants hard-delete only while `New`, replaced by Cancel once Confirmed (`RequestTable.tsx:460-487`). | B | escalation logic absent |
| P2-4 | **`cancel-session` email template missing** (part of P1-2). | B | `templates.ts` 0 hits |
| P2-5 | **Gallery caption model diverged.** App kept the legacy gold **topic-pill** + city (`0017:9-10`, `GalleryManager.tsx:213-218`); V5 removed the pill and repurposed it into a **free-text caption banner** (full sentence). No caption field exists. | C | the central point of the landing-gallery-reference |
| P2-6 | **No 20-photo live cap / FIFO eviction.** `GAL_MAX`/FIFO absent; `/api/gallery` returns all published rows. Admin can publish unlimited photos to the public carousel. | C | `api/gallery/route.ts:16` |
| P2-7 | **Payout hard-delete contradicts spec.** Spec: "No delete button anywhere, ever, by design." App ships a Global-Admin soft-delete (`PayoutTable.tsx:391-402` → `global/payouts/[id]`). Revert exists only buried in the edit-modal dropdown, without the required record-only "does not reverse the bank transfer" wording. | C | direct spec contradiction |
| P2-8 | **Instant-Undo toast absent.** No toast accepts an undo fn; no gold "Undo" link, no 9s window, no shared hide-timer — toasts are per-component plain flashes. *(Mitigated:* reversibility via edits + trash-restore, so not data-loss.) | D | `RequestTable.tsx:132`, etc. |
| P2-9 | **Sidebar: 3 groups vs spec's 4.** App merges into one "Pipeline" heading and **misfiles Session Consent under Finance** (`AdminConsoleView.tsx:245-282`); spec = Practitioner Management / Session Pipeline / Finance / System. All 10 panels present, grouping taxonomy wrong. | E | |
| P2-10 | **Sessions tab labeled "Sessions", not "Session Details"** in sidebar (`:254`) and page header (`:135`). Spec: user-facing label "Session Details", internal id stays `sessions`. | E | |

---

## P3 — Note / follow-up (functional equivalents, cosmetic)

| ID | Finding | Lane |
|---|---|---|
| P3-1 | Photo delete uses a pre-confirm dialog instead of instant-undo toast (no data-loss). | C |
| P3-2 | Landing gallery renders caption as a gold **pill**, not the full-sentence **banner** (subset of P2-5). | C |
| P3-3 | Invite form has **no role select** — invites always create an admin; role assignment decoupled to the create-account form + per-row dropdown. | D |
| P3-4 | Clickable **pending stat cards** replaced by a single-select **filter-chip bar** — toggles the same filter but shows no live counts and drops Photos' separate "Expiring" card. | D |
| P3-5 | T-shirt size list drops **XS** and renames **3XL→XXXL** vs the prototype's 7-size list (app internally consistent). | E |

---

## Where the app EXCEEDS the V5 spec (wins to keep)

- **Gallery → landing integration is CLOSED** — the prototype's central "does not, and currently cannot" gap. Admin-published photos flow to the homepage via a shared `gallery_photos` table; `/api/gallery` serves only `published=true`; a realtime channel live-refreshes the landing page (`GallerySection.tsx:52-69`, `page.tsx:1543`).
- **Real server-side authorization** everywhere (`requireAdmin` / `requireGlobalAdmin` / `requireGalleryAccess`) replaces the prototype's CSS-only role hiding — the prototype's stated #1 limitation.
- **Invite → self-service account** exceeds spec end-to-end: SHA-256 single-use token, 7-day expiry, rate-limited, creates a real Supabase auth account, **auto-activates** (no manual "Mark active"), role hard-locked server-side (no self-escalation) — `admin-invite.ts`, `admin-accept/route.ts:63-104`.
- **Activity log** is comprehensively audited across **17 routes** with realtime + dual SA-only gating and true before-snapshots (vs the prototype's 7 client-side writes).
- **Consent pipeline** is more robust: server-side snapshot auto-fill of all 12 confirmation fields, a DB unique index enforcing one active confirmation per session (`0025:41-43`), atomic mark-received, HMAC-signed consent links, Superseded/Revert via a single audited override endpoint.
- **Hardened uploads:** magic-byte MIME sniffing, 5MB cap, storage cleanup on DB failure (beyond the prototype's `createObjectURL`).
- **Application intake** is a **superset** of the prototype (adds Organisation + encrypted PAN/GST) via an additive, zero-downtime migration.
- **Soft-delete + 30-day recovery** replaces the prototype's irreversible in-memory deletes across practitioners, requests, payouts.

---

## Recommended remediation order

1. **P1-1** session status dropdown — smallest fix, unblocks the entire Photos/Payouts back-half. *(hours)*
2. **P2-10 + P2-9** label "Session Details" + regroup sidebar to 4 sections (move Consent back to Session Pipeline). *(hours — pure UI)*
3. **P1-2 + P2-4** cancel-Confirmed-request flow + `cancel-session` template. *(0.5–1 day)*
4. **P2-1 + P2-2** surface Address/T-shirt on profile + extend editable fields. *(0.5 day)*
5. **P2-5 + P3-2** gallery caption-banner model (admin field + landing render + light migration). *(0.5 day)*
6. **P1-3** practitioner Deactivate/Reactivate/Revert + Danger Zone — the largest item (migration + routes + UI). *(1–2 days)*
7. **P2-6 / P2-7 / P2-8** gallery 20-cap, payout delete policy decision, instant-undo toast. *(decide intent first — some may be deliberate improvements to keep)*

> **Decision needed from client on P2-7 (payout delete) and P2-6 (20-cap):** the app's soft-delete and uncapped carousel may be *intentional* improvements over the prototype. Confirm whether to enforce the spec's "no payout delete, ever" and 20-photo FIFO, or keep the app's behavior.

---

*Full per-requirement tables (13–10 rows per lane with file:line evidence) are available in the audit session transcript. This document is the consolidated, severity-ranked view.*
