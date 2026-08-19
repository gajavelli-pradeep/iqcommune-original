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
 * write: the agreement and the console invite. Both mint a real id in the
 * dialog rather than waiting for the send (client, 2026-08-19 — the invite
 * used to show `LINK_PLACEHOLDER` instead; the agreement never did), so the
 * link the admin reads in the preview is the link that works — nothing is
 * written by opening or closing the dialog, only the id is settled early. The
 * write still happens on Send, exactly as it did.
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
  | "session-rematch"
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
 * The shape of a tokenised link, wherever one appears in a body.
 *
 * Matched by shape rather than by equality: `buildLink` mints a fresh token on
 * every call, so the URL sitting in a composed body is never the one a second
 * call would hand back to compare against.
 */
const TOKENISED_LINK = /https?:\/\/\S+\?t=\S+/g;

/**
 * The real link, put where the body is expecting one.
 *
 * Three cases, in order, because a body can arrive in three states:
 *
 *   · the placeholder is there — the ordinary path, substitute it;
 *   · a link is already there — the draft was shown a real one, because the
 *     agreement it points at already existed. Replaced rather than left alone,
 *     so what goes out is the token this send minted rather than the one the
 *     dialog happened to render;
 *   · neither — the admin deleted it. These emails exist to carry the link, so
 *     it goes back on its own line rather than the message going out useless.
 *
 * The middle case is the one that bites if it is missing: a body holding a real
 * URL matches no placeholder, falls to the append, and the practitioner gets the
 * same link twice.
 */
export function withLink(body: string, link: string): string {
  if (body.includes(LINK_PLACEHOLDER)) return body.replaceAll(LINK_PLACEHOLDER, link);
  if (TOKENISED_LINK.test(body)) {
    // `lastIndex` survives a `test()` on a global regex and would make the
    // replace start mid-string.
    TOKENISED_LINK.lastIndex = 0;
    return body.replace(TOKENISED_LINK, link);
  }
  return `${body}\n\n${link}`;
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
  /**
   * The row the previewed link points at, when the dialog had to choose it.
   *
   * Only the agreement needs this, and only on a first issue. Every other send
   * previews a row that already exists, so its link is real without anyone
   * deciding anything. The agreement is created *by* its send — so for the link
   * to be visible beforehand, the id has to be settled in the dialog and handed
   * back with the edit, and the send creates the row under it.
   *
   * Choosing an id is not the same as allocating one: nothing is written when a
   * preview is opened or abandoned, which is the promise that matters. What
   * changes is only that the send stops picking the id itself.
   */
  linkId?: string;
  /**
   * The second message's edited text, when the dialog is carrying a real second
   * recipient rather than a WhatsApp copy — see `Draft.notify`. Absent when
   * there is no second recipient to notify.
   */
  notifySubject?: string;
  notifyBody?: string;
}

/** A composed message, ready to show. */
export interface Draft extends DraftOverride {
  to: string;
  /**
   * The same message written for WhatsApp, where the delivered document
   * supplies one. Absent on `request-cancellation`, which it does not cover —
   * that send shows no WhatsApp tab rather than an invented body.
   *
   * Delivered by handing the admin a `wa.me` link, not by an integration —
   * pressing send stays a human act in WhatsApp itself.
   */
  whatsapp?: string;
  /**
   * The recipient's number, for that link. Null where none is on file: a
   * practitioner who predates migration 0021 and whose application is gone, or
   * the admin invite, which has a mailbox and no handset. The dialog offers no
   * WhatsApp button rather than opening the app on nobody.
   */
  phone?: string | null;
  /**
   * A second recipient the same send tells, in place of the WhatsApp tab —
   * `session-cancellation`'s "Notify Practitioner" half only (client delivery,
   * latest folder, 2026-08-17).
   *
   * Not a third tab: it stands in for the WhatsApp slot on the one kind that
   * uses it, the way the spec relabels rather than adds one. Real and editable,
   * unlike the WhatsApp tab, because it is a second message this dialog's own
   * Send button actually dispatches rather than a copy an admin sends by hand
   * — the spec is explicit that one Send fires both.
   *
   * `to: null` covers a session with nobody assigned to notify: the tab still
   * shows, matching the spec, but carries only an explanatory line and nothing
   * to send.
   */
  notify?: { label: string; to: string | null; subject: string; body: string };
  /**
   * The requester's full name — `session-cancellation` and `session-rematch`
   * only, where the delivered spec's own dialog title names them directly
   * (client, 2026-08-18: "Notify about cancellation — Suresh Patel",
   * "Notify client — practitioner change — Suresh Patel"). Every other kind's
   * title is fixed and has no use for it.
   */
  recipientName?: string;
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
export const DRAFT_CHROME: Record<
  DraftKind,
  {
    title: string;
    /**
     * Builds the real title once the requester's name is known — the delivered
     * spec's own two titles both end in it (client, 2026-08-18). `title` above
     * is what shows during the brief window before the draft has loaded.
     */
    titleWithName?: (name: string) => string;
  }
> = {
  // Follows the button that opens it — a dialog headed "Send follow-up" above a
  // control labelled "Send status update to client" reads as the wrong dialog.
  "request-follow-up": { title: "Send status update" },
  "request-cancellation": { title: "Send cancellation" },
  "consent-request": { title: "Send consent request" },
  "rating-request": { title: "Seek feedback" },
  "photo-guide": { title: "Send photo guide" },
  "practitioner-welcome": { title: "Send welcome message" },
  "application-rejected": { title: "Send rejection" },
  "practitioner-deactivated": { title: "Send deactivation" },
  "session-cancellation": {
    title: "Cancel session — client's side",
    titleWithName: (name) => `Notify about cancellation — ${name}`,
  },
  "session-rematch": {
    title: "Notify client — practitioner change",
    titleWithName: (name) => `Notify client — practitioner change — ${name}`,
  },
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
  // Both cancellation reasons currently cancel this one confirmation — the same
  // effect `setConfirmationStatus` already had before the reasons split in two.
  // The fuller redesign the client's copy implies (deleting the session and
  // resetting the request to New) is the open question in the phase-2 plan,
  // not yet wired; the warning says what actually happens today rather than
  // what the label now promises.
  "session-cancellation": "Sending this also cancels this practitioner's confirmation.",
  "session-rematch": "Sending this also cancels this practitioner's confirmation.",
  "onboarding-link": "Sending this also generates the agreement and moves the application to Agreement Sent.",
  "admin-invite": "Sending this also creates the invite, valid for 72 hours.",
  // The one kind two actions open. "Mark Empanelled manually" writes the status;
  // "Send welcome message" only sends — it is offered on a profile that is
  // already Empanelled, whether by that button or by the practitioner's
  // signature. Naming the path keeps the warning from claiming a write that the
  // welcome on its own never performs.
  "practitioner-welcome": "Sending this to mark a practitioner Empanelled manually also sets that status.",
};
