# PLAN — implement `iqcommune-public-page-confirmations.docx`

Client delivery, 2026-08-14, in `client requirements/pending/`. Nine confirmations: five
on-screen success states reached by a personal link, and four popup+email pairs fired by
the two public forms.

## Amendment — the `_2` re-delivery, same day

`iqcommune-public-page-confirmations_2.docx` arrived after the work below had landed,
alongside a re-delivered `iqcommune-onboarding.html`. Diffed against the first drop, it is
almost entirely bookkeeping: the "Findings Worth a Decision" section is gone (all three
closed), every page now reads "Footer line present", the "Module assigned" row is struck
from the onboarding receipt, and items renumber 9 → 11 because the session-request popup
and email each take their own number. **Every string of Part 2 is byte-identical** — the
implementation below still matches it.

One real change: the onboarding success lede. V7 promised first session details "within
2–3 working days"; this page had already dropped that promise, but on wording chosen here,
declared as a deviation. The delivery replaces it with the client's own sentence, which
also states outright that there is no fixed timeline and names what the wait is on — a
session matching the practitioner's profile and city. The re-delivered onboarding spec
differs from the vendored copy on that one line and nothing else.

That makes the deviation obsolete rather than merely reworded: the page and the spec now
agree, so the sentence is missing from the static gate for the same reason as the rest of
the receipt — it lives behind a signature. Its declaration moves from a `deviation` of its
own into the existing `state` unit, which is the honest description of why it is absent.

| Step | Files owned |
|------|-------------|
| Vendor the re-delivered spec (root too, or `spec-freshness` reds in the main checkout) | `spec/v7/iqcommune-onboarding.html`, `client requirements/iqcommune-onboarding.html` |
| The client's sentence | `features/onboarding/OnboardingForm.tsx` |
| Retire the deviation; let the state unit claim the lede | `tests/parity/pending-onboarding.ts` |

Out of scope, deliberately: `practitionerWelcome` (`lib/email/templates.ts`) and the status
detail in `services/link-pages.ts` also say "first session details soon". Both are console
-triggered, and this delivery scopes itself to what fires from a public page without an
admin. Flagged, not changed.

## Question

Bring the code to the client's wording for every confirmation in the delivery, and close
the three items the delivery lists under "Findings Worth a Decision".

## Answer

The delivery is two different kinds of document stapled together, and they are implemented
differently:

- **Part 1 (five closed-loop screens) is a catalogue of what already exists**, quoted from
  the `spec/v7/` HTML. Those screens are governed by the one-directional parity gates, and
  the spec is their source of truth. Nothing in Part 1 is new copy — its actionable content
  is the three findings at the end.
- **Part 2 (four popup+email pairs) is new revised copy**, explicitly marked "Revised with
  the same standard as the rest of the review". This is the implementation work.

### The three findings

1. **Footer trust line missing on onboarding and post-session photos — already fixed.**
   `components/layout/LinkPageShell.tsx:69` renders the line for every emailed page, and
   the 2026-08-14 spec re-delivery (merged as #22) added it to both spec files. Verified: no
   change needed.
2. **"Module assigned" on the onboarding receipt — already fixed.** Removed by the same
   merge. Verified: zero occurrences in `features/`, `lib/`, `types/`, `services/`,
   `constants/`.
3. **Tone/salutation of the five screens — decision: do not change them.** The finding
   itself notes "Dear" cannot apply to a screen the way it applies to an email body. The
   deeper reason is structural: those five screens are asserted string-for-string against
   `spec/v7/*.html` by the parity gates. Rewriting "We'll" to "We will" on the onboarding
   receipt puts the code out of parity with the client's own HTML and buys nothing — the
   copy is already professional. The professional-tone standard therefore applies to email
   bodies and popups, which is exactly what Part 2 revises. Recorded here so the question is
   not reopened without a spec re-delivery behind it.

### Decisions taken on Part 2

- **The standard (non-waitlist) version ships behind a one-constant swap.** The client marks
  it "on deck… swap in once the waitlist phase ends". Both versions live in one module
  selected by `SESSION_REQUEST_PHASE`; flipping the constant changes the popup and the email
  together. An env var was rejected — swapping phase is a deploy either way, and a variable
  would add an `ENVIRONMENT.md` contract and an `env-contract` assertion for nothing.
- **One module owns both surfaces.** The popup and the email say the same thing in the same
  phase, so `content/session-request.ts` holds both, the way `content/submit-failure.ts`
  already holds copy shared by two dialogs. Copy that reached the email and not the popup
  would be invisible until someone submitted the form.
- **`applicationReceived` keeps its "Track your application" link.** The delivery does not
  reproduce it, but it is not a wording change — the link was separately requested by the
  client (`lib/email/templates.ts:228`). A copy review that does not mention a feature is
  not an instruction to delete it. Only the prose around it changes.
- **`Regards,` is kept above the sign-off on both session-request emails.** The delivery
  prints it for the empanelment email (#7) and omits it for the two session emails (#8, #9).
  Dropping it would make the session stream sign off differently from the practitioner
  stream, contradicting the client's 2026-08-13 decision for one consistent signature
  (`lib/email/templates.ts:8-25`). Read as a formatting slip in the document, not a reversal
  — flagged for confirmation.

## Implementation

Serial. The copy module lands first; every other lane reads from it.

| # | Step | Files owned |
|---|------|-------------|
| 1 | Both phases' popup + email copy, and the phase switch | `content/session-request.ts` (new) |
| 2 | Session-request email reads the phase; application email takes the revised prose | `lib/email/templates.ts` |
| 3 | Waitlist popup reads the phase | `features/landing/sections/RequestModal.tsx` |
| 4 | Application popup takes the revised prose | `features/practitioners/ApplyModalBody.tsx` |
| 5 | Assertions that pin the old wording | `tests/unit/email.test.ts`, `features/landing/sections/modals.test.tsx` |
| 6 | Parity declaration whose reason quotes the old receipt | `tests/parity/pending.ts` |
| 7 | Verify | — |

## Verification

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` clean.
- Both parity gates green: no undeclared missing copy, no stale pending declarations.
- Every string in Part 2 present verbatim in the code, checked by a test that reads the
  client's own wording rather than a paraphrase of it.
