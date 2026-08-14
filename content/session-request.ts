/**
 * What the session-request form says back, on screen and by email — client copy,
 * `iqcommune-public-page-confirmations.docx`, 2026-08-14.
 *
 * The client delivered two versions of this acknowledgment: the waitlist one that
 * is live while no sessions are being scheduled, and the standard one to "swap in
 * once the waitlist phase ends". Both are here, selected by `SESSION_REQUEST_PHASE`
 * below, so the swap is a single edit that moves the popup and the email together.
 * Shipping only the live one would leave the other as a paragraph in a document
 * nobody re-reads on the day it is needed.
 *
 * One module rather than the wording typed into `RequestModal` and `templates.ts`
 * separately, for the reason `content/submit-failure.ts` gives: the two surfaces say
 * the same thing in the same phase, and a change that reached the email and not the
 * popup would stay invisible until someone actually submitted the form.
 */

/**
 * Which acknowledgment is live.
 *
 * Annotated with the union rather than inferred, so both branches stay reachable to
 * the type checker and flipping this value is the whole change.
 */
export const SESSION_REQUEST_PHASE: "waitlist" | "standard" = "waitlist";

interface Acknowledgment {
  /** The dialog's heading once the form is submitted. */
  popupTitle: string;
  /** The dialog's body under that heading. */
  popupBody: string;
  /** The confirmation email's subject. */
  subject: string;
  /** Its body, above the sign-off, one string per paragraph. */
  paragraphs: (topic: string) => readonly string[];
}

const ACKNOWLEDGMENTS: Record<"waitlist" | "standard", Acknowledgment> = {
  waitlist: {
    popupTitle: "You're on the list!",
    popupBody:
      "Thank you for your interest — you have been added to our waitlist. We will notify you as soon as sessions open in your city.",
    subject: "iqcommune — you're on the waitlist",
    paragraphs: (topic) => [
      `Thank you for your interest in a session on ${topic}. You have been added to our waitlist.`,
      "We are currently focused on expanding our practitioner network across India, and are not scheduling sessions at this time. You will be notified as soon as sessions open in your city.",
      "Should your group's needs change in the meantime, please reply to this email and we will keep it on file.",
    ],
  },
  standard: {
    popupTitle: "Request received!",
    popupBody:
      "Thank you — your session request has been received. We will be in touch within 2–3 working days.",
    subject: "iqcommune — your session request has been received",
    paragraphs: (topic) => [
      `Thank you for reaching out to iqcommune. We have received your request for a session on ${topic}.`,
      "We will be in touch within 2–3 working days to better understand your group's needs and take things forward.",
    ],
  },
};

/** The live acknowledgment — what both surfaces read. */
export const SESSION_REQUEST_ACK = ACKNOWLEDGMENTS[SESSION_REQUEST_PHASE];

/** Both versions, for the test that checks each against the client's document. */
export const SESSION_REQUEST_ACKNOWLEDGMENTS = ACKNOWLEDGMENTS;
