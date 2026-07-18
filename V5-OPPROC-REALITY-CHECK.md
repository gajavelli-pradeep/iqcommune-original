# V5 Operating Procedure — Reality Check (doc vs code)

**Date:** 2026-07-18
**Doc audited:** `client_requirements/pleaseusetheseonly (V5)/iqcommune-operating-procedure-current.docx` (client's "current" Admin Console Operating Procedure — 36 steps)
**Code audited:** `iqcommune/` admin console (`components/admin/**`, `app/api/**`, `supabase/migrations/**`) at commit on `main`
**Method:** read-only. Each of the doc's 36 behavioral contracts was traced to code with file:line evidence. No code changed.

---

## Verdict at a glance

| Verdict | Count | Meaning |
|---|---|---|
| ✅ MATCH | **11 / 36** | Code does what the doc says |
| 🟡 PARTIAL | 7 | Core idea present, mechanism/scope differs |
| 🟠 DIVERGES | 10 | Implemented, but a materially different interaction |
| 🔴 MISSING | 8 | Not in the shipped console |

**Bottom line:** the doc does **not** describe the shipped V5 console. It reads like an *earlier/manual* revision of the workflow. The code has moved to a **digital, automation-first** design, and — importantly — the two migration/flag artifacts below show these divergences were **deliberate engineering decisions**, not bugs:

- `supabase/migrations/0029_request_statuses_v4.sql` explicitly **removed the "Matched" status** ("matching happens offline; the system records the outcome"). The doc's entire Part 3 spine is built on "set status → Matched".
- `SHOW_OFFSPEC_ACTIONS = false` in `SessionTable.tsx` / `AgreementTable.tsx` **hides** the manual upload / edit / delete / star-rating affordances the doc describes. The code for many of them exists but is switched off in the shipped UI.

So this is a **product-alignment decision**, not a defect list: either the doc is stale and should be rewritten to the shipped flow, or the client genuinely wants the manual flow and the code must change. Given the standing "admin console must 100% match V5" mandate, this needs a client call on **which artifact is source-of-truth for behavior** (the HTML mockup governs *layout*; this doc governs *workflow*, and they imply different things).

---

## Part 1-2 — Practitioners & Agreements

| # | Contract | Verdict | Evidence | Note |
|---|---|---|---|---|
| P1 | Website application appears as "Applied" | ✅ MATCH | `app/api/applications/route.ts:78`; `PractitionerTable.tsx:497` | Public POST inserts `status='Applied'`, realtime into table. |
| P2 | Status dropdown Applied → Screening Done → Empanelled | 🟠 DIVERGES | `PractitionerTable.tsx:21-27,590-591` | Dropdown offers Applied / Screening Done / **Agreement Sent**; Empanelled & Rejected are one-way **buttons**, filtered out of the select. Deactivated exists separately. |
| P3 | "Download prefilled agreement (PDF)" prefilled w/ name/city/module | 🔴 MISSING | `PractitionerTable.tsx:623-630` | No blank-prefilled PDF download. Instead a **"Generate agreement link"** button (e-sign URL). The only PDF download serves the *signed* stored file. |
| P4 | "Draft agreement email/WhatsApp" button beside it | 🟡 PARTIAL | `PractitionerTable.tsx:599-611`; `ContactDraftModal.tsx:253-276` | A generic Email/WhatsApp draft composer exists, but it's welcome/reject/general — not an "agreement" draft, and not beside a PDF download. |
| P5 | "Empanelled" is what makes them appear in Agreements | 🟠 DIVERGES | `app/api/admin/onboarding-link/route.ts:93-101`; trigger `0006_sign_agreement_atomic.sql` | **Causality inverted.** Agreement row is created at *link generation* (Agreement Sent), before empanelment. Signing → trigger sets Empanelled. So agreements surface *before* Empanelled. |
| P6 | Agreements Upload → drag/browse modal for signed copy | 🔴 MISSING | `AgreementTable.tsx:226-289` | No upload control at all. Signed PDF is generated server-side from the e-sign. |
| P7 | Signed-date set manually (not auto) | 🟠 DIVERGES | auto: `app/api/onboarding/sign/route.ts:78,84`; manual only in gated-off `AgreementEditModal.tsx:99` | `signed_at = now()` on sign. Manual date field exists only in the SA edit modal, which is `SHOW_OFFSPEC_ACTIONS=false`. |
| P8 | "Method" dropdown Drawn / Typed | 🔴 MISSING | `AgreementEditModal.tsx:97` (gated); `sign/route.ts:88` | No dropdown. Method captured automatically during e-sign; the only field is a gated-off free-text input. |
| P9 | Upload icon greys out after successful upload | 🔴 MISSING | `AgreementTable.tsx:230-246` | No upload → nothing to disable. Download disables on the *opposite* condition (no file yet). |
| P10 | Delete on agreement row resets to "Pending" | 🔴 MISSING | `AgreementTable.tsx:14,41-52`; `0001_schema.sql:85-86` | No "Pending" agreement status exists (only `Pending signature`/`Active`). Only a gated-off SA soft-delete. |

---

## Part 3-4 — Session Requests & Session Consent

| # | Contract | Verdict | Evidence | Note |
|---|---|---|---|---|
| R1 | Website request appears as "New" | ✅ MATCH | `app/api/session-requests/route.ts:58`; `RequestTable.tsx:315-323` | Public POST + realtime; "New — unassigned". |
| R2 | Fill practitioner + payout fields + Status dropdown | 🟠 DIVERGES | `RequestTable.tsx:495-504,664-684,545-568` | Practitioner via row **"Assign" button** (not a field); dialog collects payout **+ session date**; status dropdown doesn't drive matching. |
| R3 | Status="Matched" auto-creates session + shows ref | 🟠 DIVERGES | `assign/route.ts:71-98`; `RequestTable.tsx:273`; `0029_request_statuses_v4.sql:2` | Auto-create + ref are **real**, but fire on **Assign → "Confirmed"**, not "Matched". "Matched" was deliberately removed. No DB trigger. |
| C1 | Consent tab = 3 stacked sub-sections | 🟡 PARTIAL | `AdminConsoleView.tsx:935-961` | Only 2 (generate + track). The photo-guide sub-section doesn't exist. |
| C2 | Pick Matched session → module/city/practitioner/gross auto-fill | ✅ MATCH | `ConsentFormModal.tsx:337-347,369-383,189-193` | Works (source list is Upcoming/"Pending consent", not literally status "Matched"). |
| C3 | Fill start time, duration, TDS%, GST% | ✅ MATCH | `ConsentFormModal.tsx:427-467` | Exactly these four fields. |
| C4 | "Generate" downloads PDF; NET shown above button | 🟠 DIVERGES | `ConsentFormModal.tsx:471-479,285-293`; `consent-generate.ts:288-318` | Net box above button ✓. But Generate **sends for consent + returns a copy-link** — it doesn't download the PDF at that moment (PDF is a later row action). |
| C5 | "Draft email" button next to Generate | 🔴 MISSING | `ConsentFormModal.tsx:277-296`; `consent-generate.ts:307` | No compose/draft; the email is **auto-sent**. |
| C6 | Upload practitioner's signed reply (drag/browse) | 🟠 DIVERGES | `ConsentTable.tsx:141-166,264`; `mark-received/route.ts:32-38` | Recorded via a **"Mark received"** button (or practitioner self-signs). No upload-signed-consent modal. |
| C7 | Session status "Confirmed" surfaces it in Session Details | 🟠 DIVERGES | `assign/route.ts:86`; `sessions/[id]/status/route.ts:14`; `AdminConsoleView.tsx:138` | Session created as **"Upcoming"** at Assign and appears immediately. There is no "Confirmed" *session* status (only the *request* becomes Confirmed). |
| C8 | 3rd sub-section: Confirmed-only dropdown + photo guide + draft email | 🔴 MISSING | no `**/photo-guide/**` route; `send-photo-reminder/route.ts` | No photo-guide sub-section/route/download/draft. Nearest feature is a photo-*upload* reminder link on a different tab. |

> Net-payout math is correct & centralized: `computeNet` in `lib/consent.ts:31-43` (`net = gross × (1 − tds% + gst%)`, clamped), mirrored in `ConsentFormModal.tsx:170`.

---

## Part 5-7 — Session Details, Photos, Payouts

| # | Contract | Verdict | Evidence | Note |
|---|---|---|---|---|
| S1 | Session Details shows only Confirmed sessions | ✅ MATCH | `assign/route.ts:71-98`; `AdminConsoleView.tsx:138`; `SessionTable.tsx:194-197` | A session exists only because a request was confirmed via Assign. (Delivery status is then Upcoming/Completed/Cancelled.) |
| S2 | "Completed" unlocks rating stars on that row | 🔴 MISSING | `SessionTable.tsx:58,374-388`; `FeedbackModal.tsx:29-65` | **No inline stars on rows at all** — feedback is behind `SHOW_OFFSPEC_ACTIONS=false`. Server enforces Completed (`feedback/route.ts:85-87`) but the UI affordance is absent. |
| S3 | "Draft email" to original client asking to rate /5 | 🔴 MISSING | `SessionTable.tsx:333-343`; `ContactDraftModal.tsx` | The only draft is a gated-off "Send confirmation" to the *practitioner*. No client rating-request email. |
| S4 | Star rating restricted to GLOBAL ADMIN | 🟠 DIVERGES | `feedback/route.ts:53,131`; `SessionTable.tsx:374` | Guarded by `requireAdmin()` (any admin), not `requireGlobalAdmin`; UI gated on `!readOnly`, not `isGlobalAdmin`. (Also disabled per S2.) |
| PH1 | Every Completed session appears in Photos | ✅ MATCH | `AdminConsoleView.tsx:969-981`; `PhotosTable.tsx:159-161,324-356` | Completed sessions surface as Pending rows, or as submissions once uploaded. |
| PH2 | Upload drag/browse modal + row download icon | 🟡 PARTIAL | `PhotosTable.tsx:445`; `PhotoViewModal.tsx:164-186`; `SessionTable.tsx:345-362` | Row download is solid. **No admin upload modal** — practitioner uploads via an emailed link on a separate page. |
| PY1 | Gross & Net pre-filled from consent (not typed) | ✅ MATCH | `create-payout.ts:54-57`; `PayoutTable.tsx:406-408` | Auto-computed, non-editable (source `sessions.payout_amount` + TDS). |
| PY2 | Invoice ref is free text the operator types | ✅ MATCH | `PayoutTable.tsx:481-494,194-209`; `create-payout.ts:61` | Prefilled `INV-…` but fully overridable; empty rejected. |
| PY3 | Set dropdown to "Paid" = final step | 🟡 PARTIAL | `PayoutTable.tsx:525-540,227-232,568-578` | Terminal "Paid" exists & is final, but via a **"Mark as paid" button**, not a status dropdown; reversible by Global-Admin Revert. |

---

## Error-recovery rules & off-flow items

| # | Contract | Verdict | Evidence | Note |
|---|---|---|---|---|
| E1 | Any status freely re-editable both ways; nothing locked | 🟡 PARTIAL | `SessionTable.tsx:302-313`; `PractitionerTable.tsx:586-595,679-694`; `ConsentTable.tsx:170-191` | Sessions fully bidirectional. Practitioner terminal states + Consent/Payout reversals need a dedicated **Revert/Reactivate** or **Global-Admin** — not a free dropdown for every role. |
| E2 | Wrong upload undone via row Delete → re-upload (Agreements/Consent/Photos) | 🟡 PARTIAL | `PhotosTable.tsx:234-257,455-457`; `ConsentTable.tsx:272-295`; `AgreementTable.tsx:14,277-288` | Photos Delete works. Consent uses **Void** (Global-Admin only). **Agreements Delete is gated OFF** — shipped UI is Download-only. |
| E3 | Signed-agreement practitioner → **Deactivated** (not deleted), history kept | ✅ MATCH | `PractitionerTable.tsx:75,730-747`; `lifecycle/route.ts:44-51,68-72` | Deactivate parks the record + stores `prev_active_status`; Delete only for Applied/Screening/Rejected. Exactly as specced. |
| E4 | "Cancelled" auto-opens a pre-drafted client message to send | 🟠 DIVERGES | `RequestTable.tsx:184-203,526-542`; `cancel/route.ts:89-104`; `SessionTable.tsx:143-165` | Cancel **silently auto-emails** the client server-side (Brevo) — it does **not** open a pre-drafted modal to review/send. Cancelling from the **Sessions** dropdown notifies no one. |
| X1 | Standalone Gallery for website "Sessions in the room" | ✅ MATCH | `AdminConsoleView.tsx:143,997-1004`; `GalleryManager.tsx:60-146` | Own tab + `/api/admin/gallery` CRUD; subtitle "Standalone — not linked to practitioners/sessions/requests." |
| X2 | Settings → Team & Access to invite console users | ✅ MATCH | `AdminConsoleView.tsx:1033-1054`; `InviteTeamMember.tsx:59-122`; `TeamAccessTable.tsx:58-65` | Invite-by-email + console role; Global-Admin gated; distinct from adding a practitioner. |

---

## The six systemic divergences (what actually differs)

1. **Agreement flow — manual upload (doc) vs e-sign links (code).** P3/P6/P7/P8/P9/P10. The doc: download prefilled PDF → email → receive signed scan → upload → set method/date. The code: "Generate agreement link" → practitioner e-signs via HMAC URL → PDF auto-generated & stored → DB trigger auto-empanels.
2. **Matching — "set status Matched" (doc) vs "Assign practitioner" button (code).** R2/R3/C7. "Matched" was **intentionally deleted** (migration `0029`); a session is created at Assign with status **Upcoming**, and the *request* becomes **Confirmed**.
3. **Consent — manual PDF+draft+upload loop (doc) vs auto-email signed link + "Mark received" (code).** C4/C5/C6.
4. **Photo-guide sub-section — entirely absent (code).** C1/C8. No route, no UI, no download. Only a photo-*upload* reminder exists, and it's a different concept on a different tab.
5. **Practitioner rating — inline stars + client rating email (doc) vs gated-off / missing (code).** S2/S3/S4. Feedback UI is `SHOW_OFFSPEC_ACTIONS=false`; the backend is `requireAdmin`, not Global-Admin-only.
6. **Cancellation — review-and-send draft (doc) vs silent server auto-email (code), and no notice at all from the Sessions tab.** E4.

## What matches cleanly (11)
P1, R1, C2, C3, S1, PH1, PY1, PY2, E3, X1, X2 — the public-intake entry points, the consent field set + net math, the Photos/Payouts data automation, Deactivate-not-delete, Gallery, and Team & Access.

## Recommended next step (product decision, not a code fix yet)
Confirm with the client **which is source-of-truth for behavior**: this operating-procedure doc, or the shipped V5 code. The layout mockup and this doc pull in different directions. If the doc wins, the largest work items are (in order) the manual agreement-upload flow, the "Matched" status + photo-guide sub-section, and the inline rating/stars + client rating email — several of which already exist behind `SHOW_OFFSPEC_ACTIONS` and could be re-enabled, while others (photo guide, Matched) are net-new. If the code wins, the doc should be rewritten to the Assign/e-sign/auto-email flow.

*Read-only audit — no application code was modified. Evidence lines are as of the current `main`.*
