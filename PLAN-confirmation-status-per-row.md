# Part 2's status control belongs to the confirmation, not the session

## Question

Session Consent Part 2 lists one row per `session_practitioners` assignment, but its
status control reads and writes `sessions.status`. Three practitioners on IQC-S0007
(IQC-CONF-0009/0010/0011) therefore share one status: cancelling any row cancels all
three, and the sr-only label announces "Session status for IQC-S0007" three times for
three different controls.

Three practitioners on one session is legitimate and stays. What an admin cannot do
today is drop one of them — because the practitioner backed out, or the requestor is
not happy with them — while the session goes ahead for the rest.

## Answer

Re-bind the control from the Session column to the Confirmation ref. column, on **both**
ends. Repointing only the write would leave all three rows still displaying one value.

- **Cancelled** is per assignment: it sets `session_practitioners.deleted_at`, the column
  `link-writes.ts` already calls "a cancelled/removed assignment". No migration.
- **Pending / Confirmed** stay session-scoped — there is no per-assignment notion of
  "confirmed" (the document is `confirmation_generated_at`, consent is `consent_given_at`),
  so a session being on or off is shared truth. Choosing either on a cancelled row
  restores it first.
- Cancelling the **last live** assignment on a session also cancels the session and sends
  the client the existing cancellation email. That is what keeps one control covering both
  "this practitioner is off" and "the session is off", per the agreed shape.
- Cancelling one of several sends **no** email. Adding a practitioner-facing cancellation
  template would pull in the WhatsApp counterpart, a draft kind, and the generated copy
  doc; out of scope for this change and marked with a `ponytail:` comment.

Because `deleted_at` is what Payouts, the photo queue, ratings and `recordConsent` already
filter on, a cancelled practitioner drops out of all of them and their consent link stops
working with no further edits.

## Implementation

Serial — each step depends on the previous. No subagents.

1. **`services/console.ts`** — `CONSENT_SELECT` gains `deleted_at`; `listConsents` stops
   filtering it out so a cancelled row stays visible; `ConsentRow.sessionStatus` becomes
   `confirmationStatus` (Cancelled when the row is, else the session's status) and gains
   `onlyLiveOnSession`, counted over *all* live assignments including ones with no
   confirmation generated yet.
2. **`features/console/actions.ts`** — new `setConfirmationStatus(assignmentId, status, draft?)`.
   `setSessionStatus` stays untouched; Session Details still uses it.
3. **`features/console/panels/ConsentPanel.tsx`** — the select reads `confirmationStatus`
   and writes `row.id`; label becomes "Status for IQC-CONF-0009"; header becomes
   "Confirmation status"; the Send Consent Request gate and Part 3's Confirmed filter
   follow the same field.
4. **`features/console/panels/ConsentPanel.test.tsx`** — updated for the rename, plus
   coverage for the three new behaviours (one of several, the last one, restore).

Verify: `npx tsc --noEmit`, `npx vitest run` on the console suites, `npm run lint`.
