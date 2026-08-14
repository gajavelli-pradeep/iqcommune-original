# Console message copy — revision 2

## Question

Make the eleven console-generated messages in the product read exactly as
`client requirements/pending/iqcommune-console-messages.docx` (revision 2) says
they should, including the wiring each message needs to say what it says.

## Answer

Copy alone does not get there. Four of the eleven quote a reference number, six
quote session or request details, and one quotes a role — none of which the
templates are given today. So this is copy plus a data pass, plus one split
(cancellation) and one recipient fix (rating).

Out of scope, both recorded in the document's own Appendix B:

- **B2, availability check.** The document flags it as a gap and supplies no
  copy for it, so there is nothing to implement.
- **Appendix A, application acknowledgment.** Recommended for alignment but
  explicitly needs a client decision, and the session-request acknowledgment
  next to it is client-verbatim copy that must not move.

## Implementation

One lane, taken serially — every file below depends on the one above it, so
splitting the work would only create merge conflicts with itself.

| Step | File | Change |
|---|---|---|
| 1 | `lib/email/templates.ts` | Signature block; all eleven bodies; split `sessionRequestCancelled` into request-stage and session-stage; widen signatures for references, module, practitioner name, topic, group, role |
| 2 | `features/console/draft-kinds.ts` | `REFERENCE_PLACEHOLDER` + `withReference`, mirroring the existing link masking |
| 3 | `features/console/actions.ts` | Enrich every compose branch with the data its copy now quotes; repoint the rating request at the requestor; carry the agreement reference through the send |
| 4 | `features/console/panels/SettingsPanel.tsx` | Pass the chosen role into the invite draft so the preview matches the send |
| 5 | `lib/email/links.ts` | Invite link TTL 7 days → 3, matching the 72-hour invitation |
| 6 | `tests/unit/email.test.ts` | Signature literal; assertions for the new copy and the new template |

Verification: `pnpm typecheck`, `pnpm test`, then a mechanical diff of every
rendered body against the text extracted from the .docx.
