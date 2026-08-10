# Offline request drafts — client copy and subject lines

MOM 2026-08-10 supplies both halves of the pre-drafted email a visitor sends when
the database is paused: the subject line, and the body.

## Subjects

| Form | Subject |
|---|---|
| Session | `New Session Request - <First Name> - <Topic> (offline request)` |
| Practitioner | `New Practitioner Request - <First Name> - <City> (offline request)` |

"Module Name" resolves to the session form's **topic**: its options are the same
six module names as `constants/modules.ts`, plus the bundles and "Not sure —
help me choose". So a bundle produces a long subject. Left verbatim — the client
specified the format, the body carries everything anyway, and an over-long
subject is cosmetic and easy to change.

Parts are joined with `filter(Boolean)`, so a missing field cannot leave a
dangling ` -  - `.

## Bodies

The client's wording, verbatim, with two corrections and one refusal.

**Corrected — person.** The client's practitioner text carries "Could teach" and
"Why they want to teach" because it was copied from this code's own output.
Third person is wrong inside an email the applicant writes about themselves, so
those become "How often I could teach" and "Why I want to teach". The client
never specified those labels; they inherited our defect.

**Rebuilt — the session field list.** The pasted session draft lists t-shirt
size, modules and years of experience: the practitioner list, copied across and
never swapped. The session form asks none of them. The body uses the session
form's real fields — who this is for, organisation, topic, group size, preferred
window, venue, notes — in the client's voice.

**Kept conditional — the SPOC consent.** The client's session text prints the
SPOC/attendance agreement unconditionally. The checkbox it refers to only renders
for audiences that have one, so printing it for an individual who never saw it
would assert consent that was never given. The sentence is the client's, but it
appears only when the box was actually ticked — the same rule as today.

The practitioner consent line is used exactly as written. It names the
"Disclosure Consent" section, and all three tick-boxes live inside that one
fieldset (`ApplyModalBody.tsx:403-438`), so it does bind all three.

## Length

The session draft is measured at 2,689 characters worst case, over the ~2,048 at
which Windows' mailto handler truncates silently — a defect that predates this
change. The new body is longer, so it would ship a known regression. The session
draft therefore adopts the same self-fitting the practitioner one already has:
compose at the most generous field limit whose encoded href fits.

## Lanes

| File | Change |
|---|---|
| `features/practitioners/ApplyModalBody.tsx` | subject + body to client copy, first-person labels |
| `features/landing/sections/RequestModal.tsx` | subject + body, real session fields, self-fitting href |
| `features/practitioners/ApplyModal.test.tsx` | new subject and body assertions |
| `features/landing/sections/modals.test.tsx` | same, plus the conditional consent |

Nothing outside these four files.

## Risk

Asserting consent nobody gave. Covered by a test that submits without the SPOC
box and asserts the sentence is absent.
