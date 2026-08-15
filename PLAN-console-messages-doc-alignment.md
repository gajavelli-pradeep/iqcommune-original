# Console message copy — align to `client requirements/latest/iqcommune-console-messages.docx`

## Question

Make the ten console-generated messages read exactly as the delivered document
says, including the reference number each one quotes.

The document is revision 1 — it predates revision 2, which is what the code
implements today. That was raised, reviewed against the code twice, and the
instruction was reaffirmed. So this change is deliberately a revert of several
revision-2 fixes, and every one of them is listed under "Accepted regressions"
below so nothing is lost silently.

## Answer

Copy plus one data change. Nine of the ten messages are pure text edits inside
`lib/email/templates.ts`. Message 1 is not: the document quotes the
practitioner's `IQC-EMP` reference where the code quotes the agreement's
`IQC-AGR` one, so the send path has to hand the template a different value.

That value exists at the point of send — `sendAgreement` creates the
practitioner row, and its reference, before the email is composed
(`actions.ts:466-482`), and `practitionerContact` already returns it. The draft
preview for an application that has not been promoted yet has no practitioner
row, so it keeps showing `REFERENCE_PLACEHOLDER`, exactly as it does today.

Scope held deliberately:

- **The eleventh message stays.** `sessionRequestCancelled` is absent from this
  document, which is silence, not an instruction to delete a console control.
- **WhatsApp is not built.** There is no provider, deep link or send path. Ten
  bodies of reference copy with no delivery would be dead code.
- **Link lifetimes are unchanged.** The document drops the sentences that state
  them; that is copy, not a TTL change. `lib/email/links.ts` is untouched.
- **The eight-shot list survives outside the email.** See lane 1.

## Implementation

One lane, taken serially. `actions.ts` depends on the signatures `templates.ts`
exports, and the tests depend on both, so splitting this across agents would
only produce a merge conflict with itself.

| Step | File | Change |
|---|---|---|
| 1 | `lib/email/templates.ts` | All ten subjects and bodies; message 1 quotes the practitioner reference; message 7 drops the outstanding-items list; message 9 loses its "Warm regards," line; the photo email gets its own five-shot list |
| 2 | `features/console/actions.ts` | Pass `contact.reference` to `onboardingLink` at both call sites; drop the now-unused open-agreement reference lookup in the draft branch; drop the `outstanding` argument |
| 3 | `tests/unit/email.test.ts` | Re-point every assertion that pins revision-2 copy |

### Accepted regressions

Implemented as instructed; each reverts a fix revision 2 made.

1. **Message 1 quotes `IQC-EMP`, the practitioner reference, not `IQC-AGR`.**
   The agreement has its own sequence. A recipient who quotes this number is
   quoting their practitioner record, not the document they were asked to sign.
2. **Message 6 lists five shots without descriptions, not eight with them.**
   `SESSION_SHOTS` still has eight and still feeds the upload-page checklist and
   the confirmation PDF, which this document does not cover — so the email now
   holds its own list and the three surfaces no longer agree.
3. **Message 7 promises confirmation "within 2–3 working days".** The waitlist
   change removed that promise from the site (`iqcommune-messaging-changelog.docx`,
   and `content/session-request.ts` still runs the waitlist phase).
4. **Message 7 no longer lists what the request is waiting on.** The outstanding
   items were the reason that email is sent. They remain on the activity record.
5. **Every link-validity sentence is gone** from messages 1, 5, 9 and 10. The
   links still expire on the same schedule; the recipient is no longer told.
6. **Message 9 closes without "Warm regards,"**, breaking the one-signature
   convention the same document states on its first page.
7. **Message 8 no longer says "confirmed"**, so a cancelled request and a
   cancelled session read alike.

### Judgement calls

- **"as a [Role]"** is rendered with the article agreeing with the role, so the
  three real roles read "as a Global Admin", "as an Admin", "as a User". A
  literal "a" ships "as a Admin" to a colleague's inbox.
- **Message 8 keeps passing the module.** The document labels the value
  `[Topic]`, but this message is about a confirmed session, which has a module
  and no topic of its own. The visible change — dropping "confirmed" — is made.

Verification: `pnpm typecheck`, `pnpm test`, then a mechanical fragment diff of
every rendered body against the text extracted from the .docx.
