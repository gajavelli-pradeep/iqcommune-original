# Session Consent — open questions and assumptions

Every question raised by the three parts of the Session Consent tab, with the assumption that
will be used if no answer arrives before that line is touched.

Nothing here is implemented. This is the list to answer, not a record of decisions taken.

**Why this tab and not another.** The agreement makes it the load-bearing one: *"The session is
not confirmed until the Practitioner provides digital consent."* Every other tab records
something that already happened. This one decides whether a session legally exists.

Legend — **A** is the working assumption. **Why** is what makes the question worth asking rather
than guessing.

## What the stage flow already settled

Part 2's rows now show one next action each, derived by `lib/consent-stage.ts` from stored facts
rather than from what the page remembers. That shipped, and it answers four of the questions
below outright:

| # | Question | How the flow answers it |
|---|---|---|
| **Q1** | Reaching a confirmation's actions after a reload | Every row carries its own next action, so nothing is lost by closing the tab |
| **Q12** | Does generating notify anyone? | No — sending stays a separate act, and the row keeps offering it until it happens |
| **Q17** | Confirmed before consent returns? | **Closed.** `Confirmed` is no longer offered by the status dropdown — it is an outcome, not a setting — and `setSessionStatus` refuses it outright when no consent is on file, so the gate holds however it is called, including from a stale tab |
| **Q32** | Should a session still appear if the guide was never sent? | Yes — it sits at the `guide` stage and keeps asking |
| **Q34** | Should the guide send automatically on consent? | No, and it no longer needs a prompt: the row asks until it has been sent |
| **Q36** | Is the downloaded guide the same as the emailed one? | Both now sit on the same row, from the same assignment id, so there is one place for them to diverge instead of two |

Two more are now visible rather than fixed: **Q25** (resending) has a Resend button and the
elapsed time beside it, so a request that has gone quiet is legible — but the five-minute
duplicate window is still silent, which is **Q39**.

---

## Part 1 — Generate Confirmation

The admin picks a matched session, supplies a date, a start time and a duration, and generates
the confirmation document. Two actions follow: download the PDF, or send the consent request.

### Q1 · Should Part 1 offer an already-generated confirmation?
**A** — Yes; a reload currently loses the route to the send. *Partially addressed:* Part 2 now
carries a `Consent request` column. Whether Part 1 should *also* re-offer it is still open.
**Why** — `ConsentPanel.tsx` keeps the generated session in local state seeded from nothing.

### Q2 · Can a confirmation be regenerated when the time or date was entered wrongly?
**A** — Yes, reusing the existing `IQC-CONF` reference and overwriting the details, logged as an
override.
**Why** — A second number for one session breaks the 1:1 with the session and orphans whatever
was already sent. Today there is no path at all, so a typo is permanent.

### Q3 · Should generating be blocked when no session date is set?
**A** — Allow. Consent can precede a date, and the console doc says so explicitly.
**Why** — But clause 3(a) lists "session date and timing" among what the confirmation sets out,
and the live PDF prints `Date: To be confirmed`. Either the clause is aspirational or the
document is incomplete.

### Q4 · Where does the gross payout come from, and can it be corrected before issue?
**A** — It is set upstream and read here; correcting it is an override elsewhere.
**Why** — Clause 3(b) makes it *binding once the Practitioner provides consent*. A wrong figure
that reaches consent is a commercial commitment, not a typo.

### Q5 · What durations are offered, and is 6 hours gated on a bundled session?
**A** — Offer the values V7 offers and do not gate.
**Why** — Clause 2(a) allows 3 hours, "or up to 6 hours for a bundled two-module session". A
6-hour single-module session contradicts the contract the practitioner signed.

### Q6 · What timezone is the start time in?
**A** — IST, matching the recorded timestamps.
**Why** — Nothing on the form says. The signature timestamps had exactly this bug.

### Q7 · Can two practitioners be confirmed for one session?
**A** — The schema allows it (`session_practitioners` is per assignment); the UI assumes one.
**Why** — A bundled two-module session plausibly has two. Each would need its own consent and
its own payout.

### Q8 · Can a confirmation be generated for a session already Cancelled?
**A** — No; refuse.
**Why** — It would ask a practitioner to consent to a session that will not happen.

### Q9 · Is the currency ever anything but INR?
**A** — INR only.
**Why** — `currency` is a stored column, so something anticipated otherwise. If it can vary, the
payout formatting and the agreement's tax language both assume India.

### Q10 · What happens if Generate is pressed twice quickly?
**A** — The second is refused by the unique constraint on the reference.
**Why** — Worth confirming the error surfaces as something readable rather than a raw failure.

### Q11 · Should the confirmation be reissued if the payout changes after issue but before consent?
**A** — Yes, and the previously sent link must stop showing the old figure.
**Why** — Otherwise the practitioner consents to a number that is no longer offered.

### Q12 · Does generating notify anyone automatically?
**A** — No. Sending is a separate, deliberate act.
**Why** — This is why Q1 matters: the two acts are separable, so the second must stay reachable.

### Q13 · Should a session confirmed at short notice be flagged?
**A** — No hard block; a warning at most.
**Why** — Clause 2(c): "Sessions are typically confirmed 1–2 weeks in advance." Nothing enforces
or surfaces it.

### Q14 · Participants and audience come from the request — can they change before the session?
**A** — They can, and the confirmation should show what was true at issue.
**Why** — Clause 3(b) ties the payout to attendance at or above the committed minimum. If the
number moves after consent, which one governs?

### Q15 · Should the venue be required before a confirmation is issued?
**A** — No; `Pending from SPOC` is a real state the app already renders.
**Why** — The photo guide and the practitioner both eventually need it.

---

## Part 2 — Track Status

Every generated confirmation, its consent status, a download, and the session-status control.

### Q16 · Session set to **Cancelled** — what does Consent status show?
**A** — Render `Void — was Given <date>`, leaving `consent_given_at` untouched.
**Why** — The most consequential question on this page. Consent is evidence that something
happened, and a late cancellation may still owe the payout. Clearing it destroys the record of a
commitment; leaving it unchanged shows a live consent for a session that will never run.

### Q17 · Can Session status be set **Confirmed** before consent returns?
**A** — Warn but allow, and flag the row.
**Why** — Clause 3(a) says the session is not confirmed until consent is given. The console
currently lets an admin contradict the signed contract silently. Blocking is the stricter
reading; allowing recognises that consent sometimes arrives by phone.

### Q18 · Can Consent status go backwards, Received → Pending?
**A** — No.
**Why** — Consent is evidence, not a toggle.

### Q19 · Cancelled → Pending (reopened) — does the client get told?
**A** — No email; record it in Activity.
**Why** — They were already told it was cancelled. Silence after that is its own problem.

### Q20 · Unsigned consent — hide the download, disable it, or relabel the column?
**A** — Keep it and relabel; the PDF already declares `CONSENT NOT YET RECEIVED` on its face.
**Why** — The header promises a *signed* consent and hands over an unsigned one. Disabling it
removes the admin's only way to send the confirmation offline.

### Q21 · A Completed session shows as Confirmed in the select. Should the control lock?
**A** — Yes, once Completed.
**Why** — A delivered session can currently be set back to Pending, and nothing downstream
un-does the rating or the payout that Completed opened.

### Q22 · Can a session be cancelled once its payout is **Paid**?
**A** — Warn at minimum.
**Why** — Money has moved. A paid payout against a cancelled session reconciles to nothing.

### Q23 · Does a cancelled session keep its Download link?
**A** — Yes; the document is a record of what was issued.
**Why** — But it should probably say the session was cancelled, the way the unsigned state does.

### Q24 · The consent link expires in 7 days. What happens after that?
**A** — The practitioner asks for a fresh one and the admin re-sends.
**Why** — Nothing on this page shows that a link has lapsed, so a row sits at Pending with no
indication that the reason is expiry rather than inattention.

### Q25 · Can a consent request be re-sent as a reminder?
**A** — Yes, and the five-minute duplicate window must say "already sent N minutes ago" rather
than silently doing nothing.
**Why** — A silent no-op is indistinguishable from a broken send. This is what made the
cancellation email look broken.

### Q26 · What does `Received` mean — digital only?
**A** — Digital only.
**Why** — Ratings already support an admin recording one taken by phone, stamped with who
recorded it. If consent can arrive the same way, it needs the same distinction — and clause 3(a)
says *digital* consent specifically.

### Q27 · What happens to an outstanding consent if the practitioner is deactivated?
**A** — The row stays; the request should not be re-sendable.
**Why** — Nothing currently connects the two.

### Q28 · Multiple assignments on one session — does the session status apply to all?
**A** — Yes; status is on the session, consent is per assignment.
**Why** — The control writes to `row.sessionId`, so two rows for one session would move together
while showing separate consents. Confusing at best.

### Q29 · What does the "Issued in" filter default to, and does it hide outstanding work?
**A** — Show everything by default.
**Why** — A month filter that hides a Pending consent from two months ago hides exactly the row
that needs attention.

### Q30 · Should the table sort by outstanding-first rather than newest-first?
**A** — Keep newest-first, matching V7.
**Why** — This is a work queue. The oldest unanswered consent is the most urgent thing on it.

### Q31 · Who may see the gross payout figure?
**A** — Any console role, as today.
**Why** — Clause 7 makes session pricing confidential between the parties. A `user` role with
view-only access still sees every practitioner's payout.

---

## Part 3 — Send Photo Guide

Sessions whose practitioner has returned consent, with a downloadable guide and a send.

### Q32 · Should a Completed session still appear if the guide was never sent?
**A** — Yes.
**Why** — The guide is useless after delivery, so its absence is worth surfacing rather than
hiding. Today the list is driven by consent, not by whether the guide went out.

### Q33 · Can the guide be re-sent?
**A** — Yes, same as Q25.
**Why** — Same silent duplicate window.

### Q34 · Should the guide send automatically when consent returns?
**A** — No; keep it deliberate.
**Why** — But nothing prompts the admin either, so a session can reach its date with no guide
sent and nothing having flagged it.

### Q35 · Does the eight-shot list stay in sync across its three homes?
**A** — It must; the console doc says so explicitly.
**Why** — The list appears in the email, on the upload page and in the confirmation PDF.
Changing one is a silent divergence — there is no gate on it.

### Q36 · Is the downloaded guide the same content as the emailed one?
**A** — Yes.
**Why** — If they drift, the practitioner shooting from the PDF and the one shooting from the
email produce different sets.

### Q37 · Should the guide name the venue and date?
**A** — Yes where known.
**Why** — `Pending from SPOC` is a legitimate value, so the guide may go out without a location.

---

## Cross-cutting

### Q38 · Should every console send report what actually happened?
**A** — Yes. *Partially addressed* for session status; the rest still return `void` or have their
result discarded.
**Why** — The root of the "email never arrived" report. An Undo toast is not evidence of a send.

### Q39 · Should the five-minute duplicate window ever be visible?
**A** — Yes.
**Why** — Silently swallowing a deliberate re-send looks identical to a broken feature.

### Q40 · What is the Undo window actually undoing?
**A** — It cancels the send before it starts.
**Why** — Worth confirming it also undoes the *state change* where one is bundled — cancelling a
session both mails the client and moves the status.

### Q41 · What happens when the page is stale?
**A** — The server action refuses on a precondition that no longer holds.
**Why** — Two admins on this tab is entirely plausible; the row's local state does not know.

### Q42 · Is every state change on this tab in the Activity log?
**A** — It should be.
**Why** — Consent, cancellation and payout are the three things anyone would audit.

### Q43 · Should a `user` role see this tab at all?
**A** — Yes, read-only, as today.
**Why** — See Q31 — read-only still exposes every payout figure.

### Q44 · Does anything reconcile a session whose date has passed while still Pending?
**A** — Nothing does today.
**Why** — Such a session is stuck: never confirmed, never cancelled, never delivered, and
invisible unless someone scrolls to it.

### Q45 · Is `Completed` reachable from this tab at all?
**A** — No, deliberately — it is set from Session Details.
**Why** — Confirmed in code, and worth stating, because the select's three options make it look
like the full set.

---

## The two that block the others

**Q16 and Q17.** They decide what the two status columns mean in relation to each other, and
almost every other Part 2 question resolves differently depending on the answers. Q16 also has
one option that destroys data, so it should not be answered by default.
