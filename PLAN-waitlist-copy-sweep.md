# Waitlist copy sweep — the areas the messaging changelog missed

## Question

The client's changelog swapped 13 landing-page locations from "Request a Session" to "Join the
Waitlist". All 13 shipped. An audit found the copy that says the same thing in prose and was never
reviewed, plus the one control that still *asks* for what the copy stopped promising.

## Answer

Same principle as the changelog, applied to what it missed: remove every promise of a **date** or a
**reply window**, keep the promise to **notify**. Copy-only — no data path, no schema, no control is
removed, so this stays a like-for-like rollback exactly as the changelog's own rollback note claims.

`spec/v7/` is byte-compared against the client's delivery by `tests/unit/spec-freshness.test.ts`, so
the spec HTML must not be edited. Every string this sweep orphans is declared instead as a
`deviation` in the parity gate's pending list — the mechanism that file already exists for.

## Implementation

Serial, single-owner. The parity declarations are cross-cutting and must land with the copy they
excuse, so one hand holds all of it.

| # | Change | Files owned |
|---|---|---|
| 1 | "How it works" steps 2 and 3 reframed to the waitlist; steps 1 and 4 stand as the outcome | `features/landing/sections/HowItWorks.tsx`, `HowItWorks.test.tsx` |
| 2 | Four FAQ answers that still promised scheduling | `features/landing/sections/Faqs.tsx` |
| 3 | "Preferred date window" field reframed — kept, since it still feeds city prioritisation | `features/landing/sections/RequestModal.tsx` |
| 4 | Confirmation email's "very soon" sign-off | `lib/email/templates.ts` |
| 5 | Onboarding success promising session details in 2-3 days | `features/onboarding/OnboardingForm.tsx` |
| 6 | Parity deviations for 1-3 and for 5 | `tests/parity/pending.ts`, `tests/parity/pending-onboarding.ts` |

## Deliberately not changed

- **Practitioner empanelment's 2-3 working days** (`features/practitioners/*`, `lib/email/templates.ts`
  application replies, `services/link-pages.ts`). That reply window is about reviewing an
  *application*, and it is the promise the current phase is actively keeping. Correct as written.
- **The console's follow-up email** (`features/console/actions.ts`, `sessionRequestFollowUp`). It asks
  for dates and says "we'll get it scheduled" — but an admin sends it by hand, at the moment they are
  ready to move a request ahead. That is the transition out of the waitlist, not a contradiction of it.
- **FAQ question titles** ("Can my company book a session for a team?"). The question is the
  visitor's, not our promise; the answer is what routes them to the waitlist.
