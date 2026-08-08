# PLAN — mailto fallback when a session request cannot be saved

## Question

When `POST /api/session-requests` fails with a server fault, the modal currently
says *"Something went wrong sending your request. Please try again."* — advice
that is guaranteed to fail while the database is unreachable, and a dead end for
the visitor.

Replace it with: try again **after some time**, plus a second route out — a
`mailto:` link to the session address, with the message already drafted from
what they typed, so they only press Send.

## Answer

**`mailto:`, no backend.** The failure being recovered from is a server-side
outage, so the recovery path must not depend on the server. A `mailto:` href is
composed entirely in the browser: it cannot fail for the same reason the
submission just did, needs no endpoint, no rate limit, and opens no public
email-sending spam vector.

Decisions:

1. **Only on genuine server faults.** The fallback appears when
   `error.code === "INTERNAL"`, or when the fetch itself throws. It must *not*
   appear on `VALIDATION_FAILED` (the visitor should fix the field) or
   `RATE_LIMITED` (an escape hatch would defeat the limit). This requires the
   client to keep the error **code**, which today it discards.
2. **The draft carries everything already typed.** Re-asking for thirteen
   fields in a mail client is how a recovery path becomes worse than the
   failure. Body is built from current form state.
3. **Address arrives as a prop**, sourced from `senderFor("session")` —
   `BREVO_SENDER_SESSION`, falling back to `BREVO_SENDER_EMAIL`, the same
   resolution outbound session mail already uses. Optional throughout: both
   vars are FEATURE-tier, so when neither is set the block simply does not
   render rather than shipping `mailto:undefined`.
4. **Server owns the copy.** The "try again" wording lives in the route, not
   the component — the message the visitor sees is the route's to decide.
5. **Body length is capped.** `notes` (1000) + `venueDetails` (500) can push a
   `mailto:` past the ~2,048-char ceiling Windows' shell handler truncates at.
   Both are clamped in the draft.

## Implementation

Single lane — the prop type must agree across all four files, so this is a
dependency chain, not a partition. Executed serially by the parent.

| File | Change |
|---|---|
| `app/api/session-requests/route.ts` | INTERNAL copy → "Please try again in a few minutes." |
| `features/landing/sections/RequestModal.tsx` | `sessionEmail?` prop · keep error `code` · `draftFallbackEmail()` · fallback UI in the alert box |
| `features/landing/RequestSession.tsx` | `sessionEmail?` prop, threaded to `RequestModal` |
| `features/landing/LandingSections.tsx` | reads `senderFor("session")`, passes it down |
| `features/landing/sections/modals.test.tsx` | fallback shows on INTERNAL with a drafted body; absent on VALIDATION_FAILED |

## Verification

- `npx vitest run features/landing` — unit.
- Live: the Supabase project is currently NXDOMAIN, so a real submission
  reproduces this exact 500. Drive the form in a browser, confirm the drafted
  `mailto:` href.
