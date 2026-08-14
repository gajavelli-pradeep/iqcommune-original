# Live cross-check findings — 14 Aug 2026

A run through the real product — five emails received, one success page, one signed
agreement PDF — each compared against the client's own delivered documents.

Nothing in this document has been fixed. It is a report.

## How this was verified

Every finding below was checked against a client source file and a code location, not
against memory. Where a claim is about behaviour (the timestamp offset), the mechanism was
confirmed in code as well as observed in the artefact.

## Sources of truth — and one that is not

| Source | Path | Status |
|---|---|---|
| Public-form copy | `client requirements/pending/iqcommune-public-page-confirmations_2.docx` | authoritative |
| Console message copy | `client requirements/pending/iqcommune-console-messages.docx` | authoritative (client's original) |
| Agreement content | `client requirements/pending/iqcommune-empanelment-agreement-content.json` | authoritative, **unapplied** |
| Agreement prose | `client requirements/pending/iqcommune-empanelment-agreement-v2.docx` | authoritative |
| Console message copy | `client requirements/iqcommune-console-messages.docx` | **generated from the shipped templates — cannot be used to validate the code** |

That last row matters. The delivery-root copy states in its own header: *"the email halves
below are generated from the shipped templates, so this document and the product cannot
disagree."* Checking code against it is circular and passes no matter what the code says.
Use the `pending/` original.

## Part 1 — Emails: what matched

Five emails, all body copy identical to the client documents, word for word.

| Email | Client source | Result |
|---|---|---|
| Waitlist acknowledgment | confirmations #9 | exact match |
| Application received | confirmations #7 | exact match |
| Empanelment agreement | console msg 1 | exact match |
| Welcome — officially empanelled | console msg 2 | exact match |
| Session request follow-up | console msg 7 | one difference, below |

Sender routing is correct on all five: practitioner-pipeline mail from
`practitioner@iqcommune.com` as "Practitioner Commune", session mail from
`session@iqcommune.com` as "Session Commune". The `brevosend.com` fallback is no longer in
play for either stream.

Two appendix items closed by this run:

- **B4 — reference numbers not reachable.** Now rendered, and in the correct separate
  sequences: `IQC-AGR-0004` on the agreement email, `IQC-EMP-0004` on the welcome email.
- **B6 — audience needs its label.** `Group (register as SPOC)` renders, not the stored enum.

### Email 5 — session request follow-up, examined in full

Console doc message 7, lines 131-142. Three things worth recording, only one of which is a
defect.

**Real difference.** Client: *"We are ready to move ahead and need a little more from your
side **before we can**:"* · Sent: *"…from your side:"* (`lib/email/templates.ts:144`). The
client's sentence dangles — "before we can" *what?* — so this reads as the app quietly fixing
a slip in the delivered copy. Cosmetic, but it is a divergence from client text and nobody
recorded the decision, so it belongs in the next round of client questions.

**Not a difference — the missing `Preferred window: [Dates]` row.** Checked before flagging:
`requestEchoRows` drops optional rows on purpose (`templates.ts:162-164`) because *"a field
that is outstanding is by definition one we do not have."* No preferred window was submitted,
which is precisely why "Your preferred dates" appears in the outstanding list above it.
Printing an empty window row while asking for the dates would contradict itself. Correct
behaviour.

**Confirmed working.** `Group: 9-15 participants, Group (register as SPOC)` renders the human
label, not the stored enum — appendix item **B6** satisfied.

## Part 2 — Signature convention

Client convention (console doc, Conventions §): *"every email closes with the two-line block
'Warm regards, / Team iqcommune' — one signature across all streams."*

| Email | How sent | Sign-off | Verdict |
|---|---|---|---|
| Empanelment agreement | console | `Warm regards,` | ✓ |
| Welcome — officially empanelled | console | `Warm regards,` | ✓ |
| Session request follow-up | console | `Warm regards,` | ✓ |
| Waitlist ack | automatic | `Regards,` | exempted by Appendix A |
| Application received | automatic | `Regards,` | ⚠ the open decision |

Every console-generated email follows the convention. The only two that do not are the two
auto-sent public-form acknowledgments — exactly the pair the client's Appendix A carves out.
The session ack is recorded there as *"client-approved copy, word for word, and is not
changed here"*; the application ack carries the client's own note: *"Recommendation: bring it
in line with the convention above. It needs a decision because the copy was client-supplied."*

Half of that recommendation has shipped — the application email now opens "Dear", not "Hi".
The sign-off half has not.

## Part 3 — Signed agreement PDF: ranked differences

**Root cause for most of these.** The client shipped
`iqcommune-empanelment-agreement-content.json`, whose own `_readme` reads: *"This is the
single source of truth for the Practitioner Empanelment Agreement… **render this content
as-is**, then substitute the dynamic fields."* It has never been applied. The PDF renders
`AGREEMENT_CLAUSES` from `constants/agreement.ts`, which tracks the older V7 onboarding page —
a condensed on-screen summary. Verified three ways: `constants/agreement.ts` contains "in
bulk" (present in the V7 spec line 399, absent from the client JSON) and contains none of
"Hyderabad", "Tier 1", "InvestQ", or "seat of arbitration", all of which are in the client's
JSON and .docx.

The practitioner signed a summary, and the archived contract is that summary.

### 1 — Execution timestamp is 5½ hours wrong

Worst of these.

| Surface | Shown | Timezone |
|---|---|---|
| Success page | `14 Aug 2026, 7:06 pm` | IST |
| PDF `Signed at` | `14 Aug 2026, 1:36:58 pm` | UTC |

Same signing event, differing by exactly the IST offset. Confirmed in code, not inferred:

- `app/api/agreements/[id]/pdf/route.ts:54` — `toLocaleString("en-IN", {...})` with **no
  `timeZone`**, running server-side on Vercel (UTC).
- `features/onboarding/OnboardingForm.tsx:425` — same call, **no `timeZone`**, running in the
  browser (IST).

Neither output carries a timezone label. `app/onboarding/page.tsx:33` already pins
`timeZone: "Asia/Kolkata"` for the agreement date, so the codebase knows the pattern — these
two just do not use it. For a legal execution block, fix this first.

### 2 — The contract never names one of its two parties

Client JSON `headerFields[1]` is
`platformName: "InvestQ Commune, operating as iqcommune ('the Platform')"`, and
`introParagraph` names both parties and the effective date. Neither appears in the PDF. The
V7 onboarding spec has the Platform row too (line 366), so this diverges from **both** client
sources, not only the newer one.

### 3 — The consent attestation is missing

Client `signatureBlock.consentText`: *"By providing digital consent through the Platform's
onboarding page, the Practitioner confirms they have read, understood, and agree to be bound
by all clauses of this Agreement."* Absent. The PDF's EXECUTION block carries a provenance
note instead — that records *how* it was signed, not *what was agreed to*. Not interchangeable.

### 4 — Clause 4 prints an orphaned "(f)" with no (a)–(e)

Visible in the PDF. `constants/agreement.ts:55-63` has `paragraphs: []`, a single subClause
labelled `(f)`, and the tier text as a `highlight`; `lib/pdf/agreement.ts:55-66` renders
paragraphs → subClauses → highlights, so `(f)` prints *before* the tier summary. In the client
source, (a)–(e) carry the Tier 1 / Tier 2 structure and (f) comes last under "Employer
Disclosure". A lettered sub-clause with no predecessors reads as a drafting error to any
practitioner or lawyer who opens it.

### 5 — Clause 12 drops the seat of arbitration

Client: *"…under the Arbitration and Conciliation Act, 1996, **with Hyderabad as the seat of
arbitration**."* The PDF ends at "1996". The seat determines supervisory jurisdiction —
material, not cosmetic.

### 6 — Clause 5 is substantively weaker than the client's text

App: *"will not collect attendee contact details **in bulk**"*. Client: *"will not collect
attendee contact details, distribute product literature, or use the session as a lead
generation exercise."* The app matches V7 here, so this is the client tightening the clause in
the later delivery rather than the app inventing it — but as it stands the signed contract
permits lead-generation conduct the client intended to prohibit.

### 7 — Reference type

Client header field is `empanelmentRef` → `IQC-EMP-[Ref.]`. PDF shows
`Agreement reference: IQC-AGR-0004`. The IQC-AGR choice is deliberate and documented
(`lib/email/templates.ts:509-511` — separate sequences; the console doc records IQC-EMP as a
prior mistake), but the client's agreement header explicitly asks for the empanelment number.
Needs a ruling; possibly both belong there.

### 8 — Three taglines in play

PDF prints `WHERE FINANCIAL INTELLIGENCE CONNECTS`. Client JSON `branding.tagline` is
`INSIGHT QUOTIENT — UNLEASHED`. `constants/brand.ts` defines
`BRAND_STRAPLINE = "real insights from active professionals"`. Worth settling which is
canonical where.

## Part 4 — All open items

### Needs a client decision

| # | Item | Source |
|---|---|---|
| 1 | Application acknowledgment sign-off — `Regards,` → `Warm regards,`? | console doc Appendix A, client's own recommendation |
| 2 | Availability-check message — build it, or reword the four places that promise it? | console doc **B2** |
| 3 | Apply `iqcommune-empanelment-agreement-content.json` as-is, per its own readme? | agreement JSON `_readme` |
| 4 | Agreement header reference — IQC-EMP as the client's field asks, IQC-AGR as shipped, or both? | agreement JSON `headerFields[3]` |
| 5 | Session follow-up — keep the app's grammatical fix, or restore the client's literal wording? | console doc msg 7 |
| 6 | Which tagline is canonical, and where? | agreement JSON `branding.tagline` |

### Ours to fix — no client input needed

| # | Item | Where |
|---|---|---|
| 7 | Pin `timeZone: "Asia/Kolkata"` on both signature formatters and label the output | `app/api/agreements/[id]/pdf/route.ts:54`, `features/onboarding/OnboardingForm.tsx:425` |
| 8 | `NEXT_PUBLIC_BASE_URL` still points at `iq-commune-vert.vercel.app` — every emailed tokenised link carries it | Vercel env; `lib/email/links.ts:38` reads it |
| 9 | Console invite sender still uses `BREVO_SENDER_EMAIL`; verify it is no longer the `brevosend.com` fallback | Vercel env; `lib/email/send.ts:84` |
| 10 | Map `audience` through `AUDIENCE_LABELS` in the confirmation PDF, as the email path already does | `lib/pdf/confirmation.ts:54`, `app/api/consents/[id]/pdf/route.ts:81` |
| 11 | Add the expected payment date to the confirmation, which agreement clause 3(a) promises it carries | `lib/pdf/confirmation.ts` |

### Closed since this document was opened

| Item | Evidence |
|---|---|
| **B3 — rating request went to the practitioner** (marked *Blocking* by the client doc) | `features/console/actions.ts:1864` resolves the requestor; live email confirms |
| **Both cancellation controls sent the same body** — an unmatched request was told its session was cancelled | Two distinct templates now: `sessionRequestCancelled` (193) and `sessionCancelled` (214) |
| **Payout could be marked Paid with no invoice reference** | Server guard + UI now honours the result; regression test in `PayoutsPanel.test.tsx` |

### Product gap now live in the inbox

**B2 — the availability check does not exist.** The welcome email (email 4) promises: *"we
will reach out to check your availability before confirming anything."* The console has no
such message.

The client doc flags it against this exact email — console doc line 50: *"The availability
promise in this message is not currently backed by any console message; see B2."* Appendix B2
adds that the practitioner pages and the empanelment agreement make the same promise, so
**four separate places commit to an availability check that has no way to be sent**. It exists
only in the V7 prototype.

This is not a copy mismatch. It is the one item the console document calls out as unclosable
by copy alone: either it gets built, or the promise gets softened in all four places.

### Known gate blind spots

Two reasons a green `pnpm test` does not mean the copy is right. Both confirmed in source.

1. **`pending/` is invisible to the freshness gate.** `tests/unit/spec-freshness.test.ts:29`
   compares only against the delivery *root*, iterating tracked filenames. Anything in
   `client requirements/pending/` is never compared — including the agreement JSON that this
   whole report turns on — and a brand-new page the client adds is never noticed.
2. **Removed copy is undetectable.** The parity comparison is one-directional by design
   (`tests/parity/extract.ts:10-13`): a spec string must appear somewhere in the render, but
   the render may contain more. Copy the client *deleted* still sits on the live site and
   passes every gate.

## Round 2 — rating email, confirmation PDF, payouts

### Rating request email — exact match, and it closes a Blocking item

Console doc message 10, lines 183-191. Subject, salutation, both paragraphs, the link, the
privacy line, the closing line and the sign-off are identical, word for word. Reply routing to
the session mailbox and the stated 14-day validity both correct.

More importantly, **appendix B3 is resolved.** The console doc marks this message
**Blocking**: *"this message is written for the requestor, and the rating page tells the reader
their feedback is not shared with the practitioner. The console currently sends it to the
practitioner."* Practitioners were being asked to rate themselves.

`features/console/actions.ts:1864` now resolves the recipient with
`requestorForSession(assignment.sessionId)` and passes `requestor.email` /
`requestor.firstName`, with the practitioner appearing only as
`practitionerName: assignment.practitioner.fullName` inside the body. Addressed to the
requestor, about the practitioner — as written. The received email confirms that shape.

### Session request not proceeding — exact match, and it closes a second defect

Console doc message 8, lines 154-160. Subject, salutation, all three paragraphs and the
sign-off identical, word for word. Reply routing to the session mailbox correct.

The doc records a defect against this message: *"Why this is separate from 9: nothing was ever
scheduled here, so the message must not say a session was cancelled. **Today both controls send
the same body**; the previous revision wrote that shared body for the confirmed-session case,
which would have told people their session was cancelled when no session existed."*

That is now fixed. `lib/email/templates.ts` has two distinct templates —
`sessionRequestCancelled` (line 193, *"update on your session request"* / *"not able to take
your request … forward"*) and `sessionCancelled` (line 214, *"your session has been cancelled"*
/ names the module and session reference). A request that was never matched and a confirmed
session that falls through now say different things, as the client asked.

### Confirmation PDF — two new findings

**9 — Audience renders the raw stored value.** The PDF prints `Audience: individual` —
lowercase, and not one of the three labels the client specified. `lib/pdf/confirmation.ts:54`
passes `session.audience` straight through with no `AUDIENCE_LABELS` mapping, and
`app/api/consents/[id]/pdf/route.ts:81` hands it over unmapped. The follow-up **email** maps it
correctly, which is why appendix **B6** reads as satisfied there. It is satisfied in email and
violated in the PDF — the same field, two paths, one of them raw.

**10 — No expected payment date.** Agreement clause 3(a) states the Per-Session Confirmation
sets out *"…confirmed gross payout amount (pre-tax), and **expected payment date**."* No such
field exists anywhere in `lib/pdf/confirmation.ts`. The confirmation does not carry a term the
agreement promises it will carry.

**Worth a look, not yet a finding.** The PDF shows `Date: To be confirmed`. The console doc
records that a consent request may be sent before a date is fixed, so this is plausibly by
design — but clause 3(a) also lists "session date and timing" among what the confirmation sets
out. Whether a confirmation document with no date satisfies that clause is a question for
whoever owns the legal side.

**Not a defect.** `City: Maharastra, Mumbai` looks reversed, but
`lib/pdf/confirmation.ts:56` composes `[city, state]` in the correct order. The values were
entered the wrong way round in the form. Data entry, not code.

**Correct as built.** The unsigned state declares itself — `CONSENT NOT YET RECEIVED`, with
*"This confirmation has been issued but the practitioner has not yet agreed to it. It is not
evidence of an accepted engagement."* Same self-declaring pattern as the agreement's
`NOT YET SIGNED`. Exactly right for a document that can be downloaded before it means anything.

Finding 8 (tagline) recurs here: this PDF also prints `WHERE FINANCIAL INTELLIGENCE CONNECTS`.

### Payouts — a payout could be marked Paid with no invoice reference

Reported from live use: no `Invoice ref.` entered, yet the Actions control accepted **Paid**.

Two defects in one path, both confirmed in source:

1. **No server guard.** `setPayoutStatus` (`features/console/actions.ts`) set `paid_on` and
   never read `invoice_reference` at all.
2. **The refusal would have been invisible anyway.** `PayoutsPanel.tsx` set its optimistic
   state and then discarded the returned `ActionResult`. Any guard added server-side would have
   left the row still reading "Paid" on screen with the error swallowed — the finance view
   disagreeing with the database and nobody told.

Fixing only the first would have produced a worse bug than the one reported. The invoice cell
in the same file already handled its result correctly, so it served as the pattern.

**Fixed this round** — see the commit. `setPayoutStatus` now reads the row first and refuses
`Paid` when `invoice_reference` is empty; the panel reverts the control and shows the message,
mirroring the invoice cell. Reopening to `Pending` is still allowed without a reference — the
reference is what a payment needs, not what undoing one needs. Covered by a regression test in
`PayoutsPanel.test.tsx` that fails against the old behaviour.

Note this is not a V7 divergence: V7's prototype does not couple the two controls either. It is
a business-rule gap, and it is consistent with how the codebase already treats the reference —
`setInvoiceReference` refuses duplicates because *"quoting one number for two payments is how a
reconciliation goes wrong."* A payout paid against no reference is the same failure with
nothing to reconcile against.

## Recommended sequencing

Findings 2, 3, 5, 6, 7 and 8 are one job: apply the client's JSON as the agreement's source of
truth, the way the client asked. `constants/agreement.ts` becomes generated from (or replaced
by) the delivered JSON, and both the on-page text and the PDF follow, since they already share
one source. Finding 4 disappears with it.

Finding 1 is independent and small, and does not wait on the client.

Items 8 and 9 are environment changes and a redeploy — no code.

## Caveat

This reports copy divergence from the client's own documents. It is not a legal opinion.
Items 2, 3, 5 and 6 change what the contract says, so whoever owns the legal side should
confirm the client's JSON is the version they want executed before it ships.
