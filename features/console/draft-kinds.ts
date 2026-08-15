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

/**
 * The same problem as `LINK_PLACEHOLDER`, for the reference the agreement email
 * quotes: an agreement issued for the first time has no reference until the send
 * allocates one, and previewing must not allocate anything.
 *
 * Resending an existing agreement has a real reference and never shows this.
 */
export const REFERENCE_PLACEHOLDER = "[reference assigned when you send]";

/**
 * Stands in for the row the send is about to create, purely so the template can
 * render a body worth previewing. Never reaches an inbox — `maskLink` strips
 * the URL it produces, and the send mints the real one against the real id.
 */
export const PREVIEW_ID = "00000000-0000-4000-8000-000000000000";

/**
 * Any tokenised URL the template produced, swapped for the placeholder.
 *
 * Matched by shape rather than by equality: `buildLink` mints a fresh token on
 * every call, so the URL sitting in the composed body is not the one a second
 * call would hand back to compare against.
 */
export function maskLink(body: string): string {
  return body.replace(/https?:\/\/\S+\?t=\S+/, LINK_PLACEHOLDER);
}

/** The real link, put back where the placeholder sat. */
export function withLink(body: string, link: string): string {
  return body.includes(LINK_PLACEHOLDER)
    ? body.replaceAll(LINK_PLACEHOLDER, link)
    : // Deleted by the admin. These emails exist to carry the link, so it goes
      // back on its own line rather than the message going out useless.
      `${body}\n\n${link}`;
}

/**
 * The allocated reference, put back where the placeholder sat.
 *
 * No append fallback, unlike `withLink`: an admin who deleted the reference
 * deleted a courtesy, not the reason the email is being sent, and putting it
 * back somewhere they did not choose would be the ruder failure.
 */
export function withReference(body: string, reference: string): string {
  return body.replaceAll(REFERENCE_PLACEHOLDER, reference);
}

/** What the admin edited, as it leaves the dialog. */
export interface DraftOverride {
  subject: string;
  body: string;
}

/** A composed message, ready to show. */
export interface Draft extends DraftOverride {
  to: string;
  /**
   * The same message written for WhatsApp, where the delivered document
   * supplies one. Absent on `request-cancellation`, which it does not cover —
   * that send shows no WhatsApp tab rather than an invented body.
   *
   * Copy-only: there is no WhatsApp delivery integration, so this leaves the
   * dialog through the clipboard and an admin's own handset.
   */
  whatsapp?: string;
}

/**
 * Dialog chrome per kind — the dialog's own title.
 *
 * V7 carries a second field here, a short subject printed as "Re:" above the
 * editable Subject box. It was never the subject that sent, and the two
 * disagreed on every one of the eleven dialogs — "Cancelling a booked session"
 * over "iqcommune — your session has been cancelled". The client logged that as
 * appendix B10, so the field is gone rather than kept and corrected: a subject
 * nothing reads is a second source of truth waiting to drift again.
 */
export const DRAFT_CHROME: Record<DraftKind, { title: string }> = {
  // Follows the button that opens it — a dialog headed "Send follow-up" above a
  // control labelled "Send update to client" reads as the wrong dialog.
  "request-follow-up": { title: "Send update" },
  "request-cancellation": { title: "Send cancellation" },
  "consent-request": { title: "Send consent request" },
  "rating-request": { title: "Seek feedback" },
  "photo-guide": { title: "Send photo guide" },
  "practitioner-welcome": { title: "Send welcome message" },
  "application-rejected": { title: "Send rejection" },
  "practitioner-deactivated": { title: "Send deactivation" },
  "session-cancellation": { title: "Cancel session" },
  "onboarding-link": { title: "Send agreement" },
  "admin-invite": { title: "Send invite" },
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
  // The one kind two actions open. "Mark Empanelled manually" writes the status;
  // "Send welcome message" only sends — it is offered on a profile that is
  // already Empanelled, whether by that button or by the practitioner's
  // signature. Naming the path keeps the warning from claiming a write that the
  // welcome on its own never performs.
  "practitioner-welcome": "Sending this to mark a practitioner Empanelled manually also sets that status.",
};
