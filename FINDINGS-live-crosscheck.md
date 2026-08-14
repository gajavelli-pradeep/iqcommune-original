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
