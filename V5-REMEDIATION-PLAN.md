# V5 Remediation — Execution Plan

**Branch:** `v5/remediation` · **Baseline audit:** `V5-AUDIT.md` (commit `9e35b8e`) · **Started continuation:** 2026-07-11

> **Reframe.** "Clone the V5 mockups into the code" is already ~85–95% done — the live app implements every V5 page and *exceeds* the static mockups (real Supabase auth, gallery→landing wiring, single-use invite tokens, encrypted PAN/GST, soft-delete recovery, 17-route audit log). Four independent gap-analysis lanes confirmed the `V5-AUDIT.md` findings. The real work is **closing the audit's remaining gaps**, not re-porting.

## Client decisions (locked)
- **Scope:** Full — P1 + P2 + P3.
- **P2-7 (payout delete):** **Enforce spec** — remove delete entirely, Revert-only, add "does not reverse the bank transfer" wording.
- **P2-6 (gallery cap):** **Keep uncapped** — no code change; documented as an intentional deviation from the V5 20-photo/FIFO spec (admin controls what is published).

## Already closed on this branch (do not redo)
- **P1-1** operator-settable session status — `9cc9977`
- **P2-9 / P2-10** 4-group sidebar + "Session Details" label — `ee363c6`
- **P2-1 / P2-2 (partial)** Address & T-shirt shown + editable — `c3fbace`

## Remaining work — waves (audit remediation order)

| Wave | Items | Files (lanes) | Risk |
|---|---|---|---|
| **1** | W1a family-billing validation + T-shirt V5 list (P3-5) · W1b user-setup V5 re-skin | `lib/schemas/application.ts`, `components/public/ApplicationForm.tsx` · `app/(public)/join-admin/page.tsx`, `components/public/JoinAdminForm.tsx` | Low |
| **2** | W2a cancel-Confirmed flow + `cancel-session` template + stage-gated delete (P1-2/P2-4/P2-3) · W2b finish editable fields (P2-2) · W2c gallery caption-banner (P2-5/P3-2) | `RequestTable.tsx` + `api/admin/**` + `templates.ts` · `PractitionerFormModal.tsx`/`PractitionerTable.tsx` · gallery migration + `GalleryManager.tsx` + `GallerySection.tsx` | Med |
| **3** | W3 practitioner Deactivate/Reactivate/Revert + staged Danger Zone (P1-3) — **DB migration** | migration + new routes + `PractitionerTable.tsx` | **High — CHECKPOINT before migration** |
| **4** | W4 P2-7 remove payout delete · P2-8/P3-1 shared undo toast · P3-3 invite role select · P3-4 pending stat-cards eval · P2-6 doc | `PayoutTable.tsx` · shared toast · invite form · console | Low–Med |

## Ownership / isolation
Parent (me) owns all cross-cutting files — DB migrations, `app/globals.css` tokens, the 54 KB `AdminConsoleView.tsx` realtime core — and serializes edits to them. Parallel worktree agents only for genuinely disjoint leaf files.

## Do-not-break (preserve untouched)
Supabase auth gate (`(admin)/layout.tsx`), role routing (`/console` `/globaladmin` `/user`), realtime wiring (`useRealtimeList`), server PDF/consent math, `?t=` invite-token flow, all `api/admin/**` routes not explicitly in scope.

## Convention
Commit per logical unit as `feat(area/v5): … (P#-#)`. Run `npx eslint app components` (color-token guard) + `tsc` before each commit. Runtime-verify UI changes.
