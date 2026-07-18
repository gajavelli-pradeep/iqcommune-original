# V5 Operating-Procedure Alignment — Implementation Plan

Branch: `v5/opproc-alignment` (NOT main — nothing here deploys to production).
Goal: make the admin console match `iqcommune-operating-procedure-current.docx`, closing the 25
non-matching contracts from `V5-OPPROC-REALITY-CHECK.md` (7 partial + 10 diverge + 8 missing).

> **Standing conflict to resolve first (product decision):** several contracts require *reversing
> deliberate decisions* — migration `0029` removed the "Matched" status on purpose, and
> `SHOW_OFFSPEC_ACTIONS=false` hid the manual flows to match the **V5 HTML mockup**. Matching this
> doc therefore diverges from the "100% match the V5 mockup" mandate. This branch explores the
> doc-aligned direction; sign-off is needed before any of it merges toward `main`.
>
> **Verification limit:** the admin console is auth-gated; changes here are verified to **compile**
> (tsc + eslint) but NOT runtime-driven (no test admin credentials). DB-migration phases must be
> reviewed + applied to Supabase + runtime-verified before trust.

## Phased delivery (each phase = its own commit)

### ✅ Phase 1 — Part 5 rating loop (DONE, builds clean)
- **S2** stars unlock on Completed · **S4** rating write is Global-Admin-only.
- Files: `app/api/admin/sessions/[id]/feedback/route.ts` (POST/PATCH → `requireGlobalAdmin`),
  `components/admin/SessionTable.tsx` (feedback row action → `isGlobalAdmin && status==="Completed"`, relabelled "Rate practitioner").
- Still open in this Part: **S3** (draft "rate /5" email to the original client) — deferred to Phase 2 (needs client email plumbed onto session rows).

### Phase 2 — buildable, NO DB migration (surgical un-gates + small behaviour)
- **P7/P8/P10/E2 (agreements):** un-gate `AgreementTable` edit/delete for Global Admin; change the method field in `AgreementEditModal` from free-text to a **Drawn/Typed dropdown** (P8). *(verify `onEdit`/`onDelete` are wired from `AdminConsoleView`.)*
- **S3:** plumb the requesting client's email onto the session row (session→request join in the sessions query), add a "Draft rating email" action opening `ContactDraftModal` addressed to the client.
- **E4:** change Cancel from a silent server auto-email to opening a **pre-drafted `ContactDraftModal`** the admin reviews/sends; add a client-notify path to the Sessions-tab dropdown cancel.
- **P4:** give the Practitioners "Message" draft an agreement-specific template.
- **PY3:** expose "Paid" via a status dropdown (currently a button).
- **P2:** widen the practitioner status dropdown toward Applied→Screening Done→Empanelled (careful — Empanelled is a one-way trigger via `0006`).

### Phase 3 — DB migrations (review + apply + runtime-verify required)
- **R2/R3/C7:** reintroduce a `Matched` request status + `Confirmed` session status; make setting them the trigger that creates/surfaces the session (reverses `0029`). New migration + `assign`/status route rework.
- **P10:** add a `Pending` agreement status to the agreements CHECK constraint so Delete can reset to it.

### Phase 4 — net-new features
- **P3:** prefilled (blank) agreement-PDF **download** route + Practitioners-tab button.
- **P6/P9 · C6 · PH2:** admin **upload** modals (signed agreement / signed consent / photos) with the "grey-out after upload" lock.
- **C1/C8:** Consent tab **3rd sub-section** (photo-guide) — new route + UI + guide asset + draft email.
- **C4/C5:** make Generate **download** the consent PDF immediately + add a **Draft email** button (rework `consent-generate` from auto-send to download+draft).

## Cross-cutting files the parent (not parallel agents) must own
`components/admin/AdminConsoleView.tsx` (tab wiring, data queries), shared status enums/`lib`,
and every `supabase/migrations/*` file. UI-per-table edits can be parallelized; these cannot.
