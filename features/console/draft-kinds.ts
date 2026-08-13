/**
 * The sends that open a draft first (client, 2026-08-13; V7 `.draft-modal`).
 *
 * A plain module, not `"use server"`: the client components need the union and
 * the labels, and a server-action file may only export async functions.
 *
 * Previewing never writes. For the sends that also change a record — empanel,
 * reject, deactivate, generate agreement, the status dropdown's Cancelled
 * branch, the team invite — the draft is composed from what the record says
 * *before* the change, which is all any of these templates address the reader
 * with. The write still happens on Send, exactly as it did.
 *
 * Two of them embed a one-time link to a row that does not exist until that
 * write: the agreement and the console invite. Their preview shows the link
 * masked (see `LINK_PLACEHOLDER`) and the real one is put back in its place
 * when the message is sent.
 */
export type DraftKind =
  | "request-follow-up"
  | "request-cancellation"
  | "consent-request"
  | "rating-request"
  | "photo-guide"
  | "practitioner-welcome"
  | "application-rejected"
  | "practitioner-deactivated"
  | "session-cancellation"
  | "onboarding-link"
  | "admin-invite";

/**
 * Stands in for a one-time link while the row it points at does not exist yet.
 *
 * Written as prose rather than as a template token: an admin reading the draft
 * should understand what will be there, and `{{link}}` reads as something that
 * escaped rather than something deliberate. Substituted back on send — and if
 * the admin deletes it, the real link is appended rather than dropped, because
 * these two emails are useless without one.
 */
export const LINK_PLACEHOLDER = "[a secure one-time link is inserted here when you send]";

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
  "application-rejected": { title: "Send rejection", subject: "An update on an application" },
  "practitioner-deactivated": { title: "Send deactivation", subject: "Empanelment status" },
  "session-cancellation": { title: "Cancel session", subject: "Cancelling a booked session" },
  "onboarding-link": { title: "Send agreement", subject: "Empanelment agreement to sign" },
  "admin-invite": { title: "Send invite", subject: "Console account setup" },
};

/**
 * The sends that also change a record. The dialog warns before the button is
 * pressed, because closing it afterwards does not put the record back.
 */
export const DRAFT_WRITES: Partial<Record<DraftKind, string>> = {
  "application-rejected": "Sending this also sets the application to Rejected.",
  "practitioner-deactivated": "Sending this also deactivates the practitioner.",
  "session-cancellation": "Sending this also sets the session to Cancelled.",
  "onboarding-link": "Sending this also generates the agreement and moves the application to Agreement Sent.",
  "admin-invite": "Sending this also creates the invite, valid for 72 hours.",
  "practitioner-welcome": "Sending this from the profile also marks the practitioner Empanelled.",
};
