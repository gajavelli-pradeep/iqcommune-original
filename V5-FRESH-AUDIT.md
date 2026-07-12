# IQCommune — V5 Fresh Spec-vs-Code Audit

**Date:** 2026-07-12 · **Method:** 5-lane parallel read-only audit, every requirement re-verified against current source (prior `V5-AUDIT.md` / `CHANGELOG-V5.md` claims NOT trusted — independently confirmed).
**V5 source of truth:** `../client_requirements/pleaseusetheseonly (V5)/` — 4 HTML prototypes + 3 handoff docx (converted to md).
**Code audited:** `iqcommune/` (current working tree).

> **Headline:** The three P1 blockers from the 2026-07-11 audit are **all resolved.** Session status setter, cancel-confirmed-request + `cancel-session` email, and the practitioner Deactivate/Reactivate/Revert reversibility layer are now built and working. No P1 remains. Remaining items are 3× P2 (2 are behavioral, 1 is a client-decision deviation) and several P3 polish/consistency items.

---

## Scorecard

| Lane | Area | MATCH | EXCEEDS | P2 | P3 | Top sev |
|---|---|---|---|---|---|---|
| A | Practitioner lifecycle & Danger Zone | 5 | 0 | 2 | 1 | **P2** |
| B | Session pipeline (Requests/Sessions/Consent) | 5 | 2 | 0 | 0 | — |
| C | Gallery / Photos / Payouts / Landing | ~10 | 1 | 1 | 1 | **P2** |
| D | Invite / Activity / Undo / Filters | ~13 | 2 | 1 | 2 | **P2** |
| E | Sidebar / Labels / Forms / Master Data / Roles | 6 | 0 | 0 | 1 | P3 |

**Verdict:** V5 sign-off is **no longer blocked**. Recommend fixing the 3 P2s (or formally accepting the gallery-cap deviation) before release; P3s are follow-up polish.

---

## Resolved since 2026-07-11 (prior blockers now closed)

- **P1-1 (session status) → DONE.** `SessionTable.tsx:124-146` StatusSelect (Upcoming/Completed/Cancelled) PATCHes `api/admin/sessions/[id]/status` and persists; Completed gates Photos + Payouts eligibility. Consent column read-only (spec step 19). ✅
- **P1-2 + P2-4 (cancel confirmed request + `cancel-session`) → DONE.** `api/admin/session-requests/[id]/cancel` cascades session→Cancelled then request→Cancelled and notifies the requester; `lib/email/templates.ts:109` `sessionCancelledEmail` exists. *(Divergence: the app sends a real Brevo email directly rather than opening a draft modal — arguably EXCEEDS.)* ✅
- **P1-3 (practitioner reversibility) → LARGELY DONE.** Migration `0032_practitioner_reversibility.sql` adds `Deactivated` to the CHECK + `prev_status`/`prev_active_status`; `api/admin/practitioners/[id]/lifecycle` + `PractitionerTable.tsx` implement Deactivate/Reactivate/Revert and the 3-state Danger Zone. Remaining gaps are the stage-gating details below (A-P2). ✅ (with P2)
- **P2-9 (sidebar 4 groups) → FIXED.** `AdminConsoleView.tsx:244-291` — Session Consent correctly under Session Pipeline; Finance holds only Payouts. ✅
- **P2-10 ("Session Details" label) → FIXED.** Sidebar `:265` + header `:135`; internal id stays `sessions`. ✅
- **P2-1/P2-2 (address/T-shirt on profile + editable) → DONE.** Profile expand shows both with "Not provided" fallback (`PractitionerTable.tsx:415-416`); all 7 correction fields editable (via bulk modal, see A-P3). ✅
- **P2-5/P3-2 (gallery caption banner) → DONE.** `GalleryManager.tsx:213-218` full-sentence caption + city; landing renders a readable banner not a pill (`GallerySection.tsx:157-161`). ✅
- **P2-7 (payout no-delete) → HONORED.** No payout delete anywhere; global route `DELETE` is a 405 stub (`api/admin/global/payouts/[id]/route.ts:101`). ✅

---

## Open P2 — recommend fixing before release

### A-P2 · Practitioner Danger Zone doesn't stage-gate Delete vs Deactivate
Handoff §3.3/§5: **Applied / Screening Done / Rejected** → hard **Delete** only; **Agreement Sent / Empanelled** → Delete **blocked**, **Deactivate** shown instead. Current code:
- `PractitionerTable.tsx:594` shows **Deactivate** for every non-Deactivated stage AND `:608` shows **Delete** for every stage except Empanelled — i.e. both appear at once, and an **Agreement Sent** practitioner (with a pending-signature agreement) is hard-deletable.
- Server `api/admin/global/practitioners/[id]/route.ts` DELETE blocks only `Empanelled` — so Agreement Sent hard-delete succeeds server-side too.
- Spec wants **either/or by stage**, not both.
**Fix:** gate the buttons by stage (Delete for Applied/Screening Done/Rejected; Deactivate for Agreement Sent/Empanelled) on both client and server. Cosmetic sub-items: separator should be a **dashed** border (currently solid amber) and the section needs a **"Danger zone"** heading.

### C-P2 · Gallery has no GAL_MAX=20 / FIFO eviction
Handoff §6: live gallery capped at 20 with plain FIFO eviction of the oldest on publish past 20. Current code: no cap constant anywhere; `api/admin/gallery` appends unlimited; `/api/gallery` returns all `published=true`. This is prior **P2-6**, documented in `CHANGELOG-V5.md:106` / `V5-REMEDIATION-PLAN.md:10` as a **deliberately-kept** uncapped deviation.
**Action:** client decision — enforce the 20-cap FIFO, or formally sign off the uncapped behavior as an intentional improvement.

### D-P2 · Instant-undo toast wired to the wrong actions
Handoff §3.1: the 9s gold-Undo toast should cover **assign, empanel, reject-photos, markConsentReceived, markPaid, deletePhoto**. The mechanism exists and works (`useUndoToast.tsx`, `UNDO_MS=9000`) but is wired only to **soft-delete** in 4 tables (Agreement/Practitioner/Request/Session) — **0 of the 6 spec-named actions** have undo; Photos/Consent/Payout tables don't import the hook.
**Fix:** attach `useUndoToast` to the 6 pipeline actions (each already has a reversible server path). *(Keeping undo on soft-deletes too is a net positive — this is additive.)*

---

## P3 — follow-up polish

| ID | Finding | Lane | Evidence |
|---|---|---|---|
| P3-A1 | Field corrections use one bulk "Edit details" modal, not per-field pencil icons (spec §2). Functionally equivalent — all 7 fields editable. | A | `PractitionerFormModal.tsx:159-179` |
| P3-A2 | Practitioner **Revert** fires with no confirm dialog; spec §3.2 says "Confirms, then restores". (Deactivate does confirm.) | A | `PractitionerTable.tsx:550-557` |
| P3-A3 | Legacy `Under Review` status still in CHECK + dropdown — a superset of the V5 pipeline; admin can set a non-spec stage. | A | migration `0032`, `PractitionerTable.tsx:21-28` |
| P3-C1 | Payouts tab header doesn't state the no-delete policy (spec wants it stated); only in code comments. | C | `AdminConsoleView.tsx:138` |
| P3-D1 | Invite role `<select>` omits **Global Admin** (Admin/User only) — deliberate self-escalation guard; GA still grantable via create-admin + role dropdown. | D | `CredentialsModal.tsx:479-486` |
| P3-D2 | Undo link is gold+bold but **not underlined** (spec: "gold underlined"). | D | `useUndoToast.tsx:60-64` |
| P3-E1 | Master Data table is correctly scoped to Name/Phone/Email/City/State (§141), but the **section blurb text still names "communication address, and T-shirt size"** and the **CSV export still includes** those 2 columns — inconsistent with the deliberate 5-field table scope. | E | `MasterDataTable.tsx:93-94,101-104` |
| P3-D3 | `TableFilterBar.tsx` is effectively **dead code** — imported only for a type; no table renders it. PendingBar is the shipped filter UI. | D | `TableFilterBar.tsx`, `PendingBar.tsx` |

---

## Where the app EXCEEDS V5 (unchanged wins)

- **Cancel notification** sends a real idempotent Brevo email rather than a manual draft (Lane B).
- **Consent PDF** is generated, stored server-side, emailed, and offered as a download action — vs prototype's browser-download-on-generate (Lane B).
- **Gallery → public landing is fully wired** (published photos served via `/api/gallery`, realtime refresh, plus "Feature in gallery" copying completed-session photos) — the prototype's central "cannot connect" gap (Lane C).
- **Invite → self-service account** exceeds spec: SHA-256 single-use token, 7-day expiry, IP rate-limit, real Supabase auth account, auto-activate, server-locked role (Lane D).
- **Activity log** writes from **31 routes / 39 call-sites**, realtime, GA-only GET-only tamper-proof read (Lane D).
- **Gallery access** is stricter than spec: per-account `gallery_access` grant on top of role (Lane C).

---

## Recommended order
1. **A-P2** stage-gate Delete/Deactivate (client + server) — data-safety correctness. *(hours)*
2. **D-P2** move/extend instant-undo to the 6 pipeline actions. *(hours)*
3. **C-P2** decide gallery 20-cap: enforce or formally accept. *(client decision)*
4. **P3-E1** fix Master Data blurb + CSV to match the 5-field scope. *(minutes)*
5. Remaining P3s as polish.
