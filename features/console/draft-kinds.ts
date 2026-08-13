/**
 * The sends that open a draft first (client, 2026-08-13; V7 `.draft-modal`).
 *
 * A plain module, not `"use server"`: the client components need the union and
 * the labels, and a server-action file may only export async functions.
 *
 * These are the sends whose whole purpose *is* the email, so previewing one has
 * no side effect — the builder behind `composeDraft` only reads. The sends that
 * also change a record (empanel, reject, deactivate, generate agreement, the
 * status dropdown's Cancelled branch, and the team invite) are deliberately not
 * here: their mail is a consequence of a write, so a preview cannot show it
 * without either performing the write or guessing at it. They keep the plain
 * 15-second Undo until that is decided.
 */
export type DraftKind =
  | "request-follow-up"
  | "request-cancellation"
  | "consent-request"
  | "rating-request"
  | "photo-guide"
  | "practitioner-welcome";

/** What the admin edited, as it leaves the dialog. */
export interface DraftOverride {
  subject: string;
  body: string;
}

/** A composed message, ready to show. */
export interface Draft extends DraftOverride {
  to: string;
}

/** Dialog chrome per kind — V7 sets a title and a subtitle on every open. */
export const DRAFT_CHROME: Record<DraftKind, { title: string; subject: string }> = {
  "request-follow-up": { title: "Send follow-up", subject: "Follow-up on a session request" },
  "request-cancellation": { title: "Send cancellation", subject: "Cancelling a session request" },
  "consent-request": { title: "Send consent request", subject: "Session confirmation and payout consent" },
  "rating-request": { title: "Seek feedback", subject: "Rating request for a completed session" },
  "photo-guide": { title: "Send photo guide", subject: "Shot guide and upload link" },
  "practitioner-welcome": { title: "Send welcome message", subject: "Empanelment welcome" },
};
