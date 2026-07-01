# IQCommune — "Open Items" & Code Review

Last reviewed: 2026-07-01
Verified by: live code audit across all 20 admin components (not assumptions)

---

## P1 — Core Missing Features

### 1. Edit Row — ✅ DONE (2026-07-01)

Full edit is now built for all 5 core entities: `PATCH /api/admin/super/{practitioners,sessions,requests,payouts,agreements}/[id]` (each `requireSuperAdmin` + audited prior-state snapshot + Zod `.partial().strict()`). Edit mode added to `PractitionerFormModal` / `SessionFormModal` / `RequestFormModal` (create+edit in one component); dedicated `PayoutEditModal` / `AgreementEditModal`. SA-gated `✏ Edit` buttons in all 5 tables; payout net is recomputed server-side. **Original finding (now resolved) below.**

No edit modal exists for any entity's core row data. The existing form modals are **create-only** — they have no `initialData` / edit mode.

**Code evidence — PATCH routes (super admin tier):**
```
app/api/admin/super/practitioners/[id]/route.ts  — DELETE only
app/api/admin/super/sessions/[id]/route.ts       — DELETE only
app/api/admin/super/requests/[id]/route.ts       — DELETE only
app/api/admin/super/payouts/[id]/route.ts        — DELETE only
app/api/admin/super/agreements/[id]/route.ts     — DELETE only
```
No PATCH route exists for any entity. Only `PATCH /api/admin/super/users/[id]/password` (password-change only).

**What does exist (inline status-only edits, not full edit):**
| File | Line | What it does |
|---|---|---|
| `PractitionerTable.tsx` | 68 | Inline status `<select>` — status field only |
| `PayoutTable.tsx` | 132 | Mark-paid toggle |
| `RequestTable.tsx` | 125 | Status `<select>` |
| `RequestTable.tsx` | 145 | Assign practitioner |
| `PhotosTable.tsx` | 102 | Reject action |
| `PhotosTable.tsx` | 119 | Approve action |

These are narrow action buttons, not full-row edits.

**What needs to be built:**
| Table | Edit Modal to build | PATCH route to build |
|---|---|---|
| Practitioners | `PractitionerEditModal.tsx` | `PATCH /api/admin/super/practitioners/[id]` |
| Sessions | `SessionEditModal.tsx` | `PATCH /api/admin/super/sessions/[id]` |
| Requests | `RequestEditModal.tsx` | `PATCH /api/admin/super/requests/[id]` |
| Payouts | `PayoutEditModal.tsx` | `PATCH /api/admin/super/payouts/[id]` |
| Agreements | `AgreementEditModal.tsx` | `PATCH /api/admin/super/agreements/[id]` |
| Photos | status-only (approve/reject already exist) | no full edit needed |

Each table needs an `✏ Edit` button in the Actions column, visible only when `isSuperAdmin`.

---

### 2. Dead Button — ✅ FIXED (2026-07-01, removed)

Found during audit: `RequestTable.tsx` had a **"Create session from request"** button that rendered clickable but fired no action (`onClick` only called `e.stopPropagation()`). **Resolved by removing it** — a request maps poorly onto a session (needs an empanelled practitioner + date/times/payout the request lacks), so a half-prefilled modal added risk with little value.

---

### 3. Add New Entry — MOSTLY DONE, 2 GAPS ⚠️

**What's already wired in `AdminConsoleView.tsx`:**
| Button | Line | Modal | Super admin only? |
|---|---|---|---|
| `+ Add manually` | 153 | `PractitionerFormModal` | No (all admins) |
| `+ Create session` | 157 | `SessionFormModal` | No (all admins) |
| `+ Create payout` | 700 | `PayoutFormModal` | Yes |
| `Credentials` | 738 | `CredentialsModal` | Yes |

All 4 modals are mounted at `AdminConsoleView.tsx` lines 762–781.

**Status:**
- Requests — ✅ DONE (2026-07-01): `RequestFormModal.tsx` (create+edit) + `POST /api/admin/session-requests` (`requireAdmin`) + "+ Add request" button on the Requests tab.
- Agreements — no "Add agreement" UI (created via the empanelment flow — SA-add not needed).
- Photos — no "Add photo set" UI (photos come via the public submit-photos flow — SA-add not needed).

---

## ~~P1 — Super Admin Login Page~~ ALREADY BUILT ✅

**Code found:** `app/super-login/page.tsx` — route `/super-login`
- Dark `var(--ink)` themed page with gold shield icon, separate from regular `/login`
- Checks `app_metadata.role !== "super_admin"` after sign-in; signs out non-SA users immediately
- On success: redirects to `/console/super`

---

## ~~P1 — SA/Admin Password Management~~ ALREADY BUILT ✅

**Code found:**
```
components/admin/CredentialsModal.tsx
app/api/admin/super/users/[id]/password/route.ts
app/api/admin/super/users/route.ts
app/api/admin/super/users/[id]/route.ts   ← added 2026-07-01 (PATCH role, DELETE)
```
- Lists all admin accounts with email, role, last sign-in
- Per-user inline "Set password" form (min 8 chars, show/hide toggle)
- `PATCH /api/admin/super/users/[id]/password` — `requireSuperAdmin()` gated, `logSuperAdminAction("set_password")` logged

**Full admin user management — ✅ DONE (2026-07-01):** `CredentialsModal` now also **creates** (`POST /api/admin/super/users`), **promotes/demotes** role, and **removes** admins (`PATCH`/`DELETE /api/admin/super/users/[id]`), all audited. Self-demote / self-delete blocked in both UI and API. (Resolves the "G-SA7 admin user management absent" gap.)

---

## P2 — Infrastructure

### 4. Git Commit — PENDING ❌

All changes from the last session are disk-only, not committed:

```
components/admin/SessionTable.tsx
components/admin/RequestTable.tsx
components/admin/PractitionerTable.tsx
components/admin/PayoutTable.tsx
components/admin/AgreementTable.tsx
components/admin/PhotosTable.tsx
lib/hmac.ts
app/api/admin/sessions/[id]/photo-link/route.ts
lib/schemas/photo-submission.ts
FEATURE-AUDIT.md
OPEN-ITEMS.md                                    ← this file
```

What changed: ConfirmDialog wired to all 6 tables, photo link URL fix, Zod v4 fix, FEATURE-AUDIT.md update.

**Action:** `git add` the above files + `git commit`.

---

### 5. DB Migrations

**0012 / 0013 — ✅ APPLIED** (via `RUN-IN-SUPABASE-SQL-EDITOR.sql`, the consolidated v2 file, which contains 0001–0013 incl. `session_feedback` + `super_admin_audit_log`). Confirmed live.

**0014 / 0015 / 0016 — ✅ DRAFTED (2026-07-01), NOT YET APPLIED** — cover review gaps #8 / #10 / #11:
```
supabase/migrations/0014_practitioner_pipeline_timestamps.sql   -- #8  stage timestamps + BEFORE UPDATE trigger + backfill
supabase/migrations/0015_feedback_subsection_averages.sql       -- #10 practitioner_subsection_averages view
supabase/migrations/0016_soft_delete.sql                        -- #11 deleted_at columns + active indexes + purge_soft_deleted()
```
**Action:** paste `RUN-IN-SUPABASE-SQL-EDITOR-v3.sql` (root) into the SQL Editor — all three, idempotent, in one transaction.

**Follow-up app wiring — ✅ ALL DONE (2026-07-01):**
- #8: `database.types.ts` extended; `PractitionerTable` passes all 4 stage timestamps into `PipelineStepper` (a date now shows beside every step).
- #10: `practitioner_subsection_averages` view typed + read in both console loaders; the practitioner expanded row shows a **Feedback breakdown** (Content/Delivery/Engagement/Logistics + rated count).
- #11: **soft-delete live** — all 5 SA DELETE routes now `update({ deleted_at })` (audited); every admin list read (2 console loaders + 5 GET routes) filters `.is("deleted_at", null)`; onboarding-link excludes deleted practitioners; delete confirm copy updated to "recoverable for 30 days"; purge runs daily via `app/api/cron/purge-soft-deleted` (needs `CRON_SECRET`, already set for expire-photos) added to `vercel.json`.
  - Deliberately **not** filtered: single-row operational reads (mark-paid/sign/create-payout/feedback/assign/status) — a deleted row already vanishes from all lists, so it's unreachable in normal flow.
  - **Trash/Restore UI** (2026-07-01): Settings → **Trash** (SA-only) lists all soft-deleted rows across the 5 tables; each can be **Restored** (clears `deleted_at`) or **Deleted forever** (immediate purge, FK-guarded → 409). API: `app/api/admin/super/trash/route.ts` (GET/POST/DELETE, audited).

---

### 6. Vercel Production Branch — MANUAL ACTION NEEDED ⚠️

Production branch is `feat/color-tokens-and-shared-chrome`, should be `main`.

**Action:** Vercel Dashboard → Project Settings → Git → Production Branch → `main`.

---

## ~~P3 — Remove v1 Files~~ NOT APPLICABLE ✅

No v1 legacy files exist in the `iqcommune/` app directory. `client_requirements/V1/` and `V2/` are intentional design mockup references (called out in `CLAUDE.md`). Nothing to delete.

---

## Summary

| # | Item | Status | Action |
|---|---|---|---|
| 1 | Edit row for all 6 tables | ❌ Not built | Build edit modals + PATCH routes (5 files + 5 routes) |
| 2 | Dead "Create session from request" button | ❌ Bug | Wire or remove — `RequestTable.tsx:497` |
| 3 | Add new entry | ⚠️ Mostly done | Build `RequestFormModal`; decide on Agreements/Photos |
| 4 | Super admin login page | ✅ Done | — |
| 5 | SA/admin password management | ✅ Done | — |
| 6 | Git commit | ❌ Pending | Commit 10 changed files |
| 7 | DB migrations 0012 + 0013 | ⚠️ Files exist | Run in Supabase SQL Editor |
| 8 | Vercel branch → main | ⚠️ Pending | Change in Vercel dashboard |
| 9 | Remove v1 files | ✅ N/A | Nothing to remove |

---

## Recommended Next Steps

1. **Commit** all current session changes — 5 min
2. **Apply migrations** 0012 + 0013 in Supabase SQL Editor — 5 min
3. **Change Vercel branch** to `main` — 2 min
4. **Fix dead button** in `RequestTable.tsx:497` — 15 min
5. **Build `RequestFormModal`** + wire "Add request" — 1 hr
6. **Build Edit modals** — the biggest remaining gap; start with `PractitionerTable`, replicate pattern to the other 4 tables
