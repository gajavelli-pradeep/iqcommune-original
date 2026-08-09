# Practitioner application — mailto fallback on submit failure

The session request form already offers a rescue hatch when the server cannot
save a submission: a `mailto:` with the whole form pre-drafted, so the visitor
loses nothing. The empanelment application — the longer of the two forms — has
no such path. `ApplyModalBody` shows a red alert and stops, and the applicant's
answers are gone.

Client, 2026-08-07: `practitioner@iqcommune.com` is live and owns all
practitioner correspondence. `PRACTITIONER_CONTACT_EMAIL` is the address that
form writes to.

## Decision

Mirror `RequestModal` exactly. This is the second instance of a pattern that is
already reasoned and shipped, so the job is to copy it faithfully rather than
invent a second design.

| Concern | Session (existing) | Practitioner (this change) |
|---|---|---|
| Recipient | `SESSION_CONTACT_EMAIL` → `senderFor("session")` | `PRACTITIONER_CONTACT_EMAIL` → `senderFor("practitioner")` |
| Resolved in | `LandingSections` (server) | `PractitionerSections` (server) |
| Threaded through | `RequestSessionProvider` → `RequestModal` | `ApplyProvider` → `ApplyModal` |
| Offered when | `error.code === "INTERNAL"`, or fetch threw | same |
| Never offered when | validation or rate-limit failure | same |

`mailto:`, no backend — the failure being recovered from is the server being
down, so the recovery must not need it. Resolved on the server and passed as a
plain prop, never `NEXT_PUBLIC_`, which would bake it into the bundle and ship
`mailto:undefined` when unset.

Not offered at all when the address is unset, rather than rendering a broken
link. Both fallbacks are FEATURE-tier.

## Why only INTERNAL earns the offer

A validation error is the applicant's own to fix, and emailing it bypasses the
schema. A rate limit exists precisely so it is not routed around. Only a server
fault — or an unreachable server — means the form itself failed the person.

## Draft length

`motivation` is capped at 1500 chars by the schema and `address` at 400, so the
encoded href can exceed the ~2,048 characters Windows' mailto handler truncates
at. Free text is clamped to 400 in the draft, the same ceiling the session
draft uses, and for the same reason.

## Lanes

| File | Change |
|---|---|
| `lib/env.ts` | `PRACTITIONER_CONTACT_EMAIL` in `FEATURE_ENV` |
| `features/practitioners/PractitionerSections.tsx` | resolve the address, pass to the provider |
| `features/practitioners/ApplyModal.tsx` | `practitionerEmail?` prop, threaded to the modal |
| `features/practitioners/ApplyModalBody.tsx` | `draftApplicationEmail()`, error carries `offerEmail`, fallback UI |
| `features/practitioners/ApplyModal.test.tsx` | offered on INTERNAL and on network failure; withheld on validation and rate limit |
| `.env.example`, `docs/ENVIRONMENT.md` | declare and document it |

## Risk

The one that matters is offering the escape hatch too widely. If `offerEmail`
were ever set on a validation failure, every applicant who mistyped a phone
number would be invited to email instead — routing around the schema and
landing malformed applications in a human inbox. The tests pin all four cases,
not just the two that show the button.
