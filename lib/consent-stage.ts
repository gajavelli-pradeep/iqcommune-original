/**
 * Which one thing a confirmation needs next.
 *
 * Part 2 used to be a table you read. Every row carried a download and a status
 * dropdown, and the work — request consent, chase it, confirm the session, send
 * the guide — was spread across three separate boxes on the page, each with its
 * own picker. An admin had to know which box a given session belonged in, and
 * Part 1 only offered its two actions in the render that followed a successful
 * generate, so closing the tab lost them for good.
 *
 * A confirmation is only ever at one point in that sequence, and each point has
 * exactly one sensible next action. Deriving it here — from stored facts, never
 * from what the page remembers — means the row can just say what it needs, the
 * answer survives a reload, and two admins looking at the same session see the
 * same thing.
 *
 * Ordering matters and is not arbitrary. Cancelled and Completed are checked
 * first because they are terminal: a cancelled session must not ask anyone for
 * consent, and a delivered one has nothing left to chase. Everything after that
 * reads as the sequence itself.
 */

export type ConsentStage =
  /** Confirmation exists, nobody has been asked yet. */
  | "request"
  /** Asked, waiting on the practitioner. */
  | "waiting"
  /** Consent is in; the session is still not marked Confirmed. */
  | "confirm"
  /** Confirmed, and the practitioner has not been told what to shoot. */
  | "guide"
  /** Everything sent. Waiting for the session to happen. */
  | "in-flight"
  /** Out of the pipeline — no next step, and no chasing. */
  | "cancelled"
  /** Already delivered. */
  | "delivered";

/** Only the fields the stage depends on, so the rule is testable on its own. */
export interface StagedRow {
  status: "Received" | "Pending";
  sessionStatus: string;
  /** When the consent request went out, or null if it never has. */
  requestSentAt: string | null;
  /** When the photo guide went out, or null if it never has. */
  guideSentAt: string | null;
}

export function consentStage(row: StagedRow): ConsentStage {
  if (row.sessionStatus === "Cancelled") return "cancelled";
  if (row.sessionStatus === "Completed") return "delivered";

  // Consent gates everything downstream. The agreement is explicit — "The
  // session is not confirmed until the Practitioner provides digital consent" —
  // so no later step is offered until it lands.
  if (row.status !== "Received") return row.requestSentAt ? "waiting" : "request";

  if (row.sessionStatus !== "Confirmed") return "confirm";
  return row.guideSentAt ? "in-flight" : "guide";
}

/**
 * How long ago, in the roughest unit that is still true.
 *
 * "Sent 3 days ago" answers the only question being asked of it — has this been
 * sitting too long? — which an exact timestamp answers worse. `now` is a
 * parameter rather than read inside, so the label is deterministic in a test and
 * cannot drift between the server render and the client's clock.
 */
export function sinceLabel(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

