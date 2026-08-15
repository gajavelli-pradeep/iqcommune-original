/**
 * What a confirmation must carry before it can be generated.
 *
 * A plain module, not `"use server"`: these are synchronous and a server-action
 * file may only export async functions — the same reason `draft-kinds.ts` sits
 * apart. Being importable is also what makes them testable, which matters more
 * here than usual: this is the guard, and a guard nothing exercises is a guard
 * nobody notices has stopped working.
 *
 * Part 1 of the consent panel showed a placeholder wherever a value was absent
 * — "Pending from SPOC" for a venue, an em dash for the headcount, "[to be
 * scheduled]" for a date — and generated the document anyway. The PDF carries
 * its own fallbacks (`venue ?? "To be confirmed"`), so nothing downstream ever
 * objected, and the practitioner was asked to consent to a session with no
 * venue, no headcount and no date. A confirmation states the terms; terms with
 * holes are not terms.
 */

/** The embedded session row, as the assignment query returns it. */
export interface ConfirmationSession {
  module: string | null;
  city: string | null;
  state: string | null;
  venue: string | null;
  participants: string | null;
  spoc_name: string | null;
  audience: string | null;
}

export interface ConfirmationAssignment {
  gross_payout: number | null;
  session: ConfirmationSession | null;
}

/** The three the admin fills in on the generate form. */
export interface ConfirmationEntry {
  sessionDate: string | null | undefined;
  startTime: string | null | undefined;
  durationHours: number | null | undefined;
}

const blank = (value: string | null | undefined) => !value || value.trim().length === 0;

/**
 * The fields still empty, under the labels Part 1 puts on them — a message
 * naming `spoc_name` would send an admin looking for a control that says
 * "SPOC name". Screen order, so an admin reads the message once and works down
 * the form: the auto-populated block first, then the three boxes they fill in.
 *
 * The stored `session_date` deliberately plays no part. The date box opens
 * blank, so letting a stored date satisfy the check would mean a date nobody
 * looked at reaching a signed document — the same failure as the invented
 * 10:00 AM, just with a value that happens to have come from the database.
 * Every field labelled "(admin enters)" is now actually entered by the admin.
 */
export function missingConfirmationFields(
  assignment: ConfirmationAssignment,
  entered: ConfirmationEntry,
): string[] {
  const session = assignment.session;
  if (!session) return ["Session"];

  const missing: string[] = [];

  if (blank(session.module)) missing.push("Module confirmed for");
  if (blank(session.venue)) missing.push("Venue");
  if (blank(session.city)) missing.push("City");
  if (blank(session.state)) missing.push("State");
  if (blank(session.audience)) missing.push("Audience type");
  if (blank(session.participants)) missing.push("Participant count");
  if (blank(session.spoc_name)) missing.push("SPOC name");
  // Zero counts as missing rather than as free. This document is what states
  // the payout a practitioner is consenting to, and nobody consents to nothing.
  if (!assignment.gross_payout || assignment.gross_payout <= 0) {
    missing.push("Agreed gross payout");
  }

  if (blank(entered.sessionDate)) missing.push("Session date");
  if (blank(entered.startTime)) missing.push("Start time");
  // Zero is what `Number("")` gives for an untouched picker, not a real length.
  if (!entered.durationHours) missing.push("Duration");

  return missing;
}

/** One sentence naming what is missing and where to fix it. */
export function describeMissing(missing: string[]): string {
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  const verb = missing.length === 1 ? "is" : "are";
  // "fill this in" was written when one field at a time was the common case.
  // The usual message now names three, and an untouched form names them all.
  return (
    `${list} ${verb} still empty. A confirmation states the terms a practitioner consents to, ` +
    `so it cannot be generated with gaps — fill in what is missing above, then generate again.`
  );
}
