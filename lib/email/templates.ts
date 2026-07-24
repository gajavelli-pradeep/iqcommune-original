import { SESSION_SHOTS } from "@/constants/photo-shots";

import { buildLink } from "./links";
import type { EmailMessage } from "./send";

/**
 * Plain-text templates.
 *
 * Every link is built by `buildLink`, never assembled here — a template that
 * concatenated an id would put a guessable identifier in a URL, which is the
 * thing ADR 0004 exists to prevent.
 *
 * Every template also declares its `stream`, which decides the mailbox it is
 * sent from (client decision, 2026-07-23): practitioner-pipeline mail from
 * practitioner@, session mail from session@, so a reply reaches the person
 * whose job it is. It is declared here rather than at the call site because
 * which mailbox an email belongs to is a property of the email. A template
 * with no stream is `platform` — currently only the console team invite.
 */

const lines = (...parts: string[]) => parts.join("\n");

/** Exact copy from the client's request-acknowledgment spec — subject, body
 *  and sign-off all specified verbatim, not the house style used elsewhere
 *  in this file. */
export function sessionRequestReceived(to: string, firstName: string, topic: string): EmailMessage {
  return {
    template: "session-request-received",
    stream: "session",
    to,
    subject: "iqcommune — your session request has been received",
    body: lines(
      `Hi ${firstName},`,
      "",
      `Thanks for reaching out to iqcommune — we've received your request for a session on ${topic}.`,
      "",
      "We'll get in touch within 2–3 working days to understand your group's needs a little better and take things forward from there.",
      "",
      "Regards,",
      "The iqcommune Team",
    ),
  };
}

/**
 * The console's "Send follow-up to client" — chasing a request that is waiting
 * on something from the requester's side.
 *
 * It names what is outstanding rather than asking them to guess: the commonest
 * reason a request stalls is a venue nobody has confirmed, and "just checking
 * in" does not get one.
 */
export function sessionRequestFollowUp(
  to: string,
  firstName: string,
  outstanding: readonly string[],
): EmailMessage {
  return {
    template: "session-request-follow-up",
    stream: "session",
    to,
    subject: "Following up on your session request",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Following up on your session request - we're ready to move ahead and need a little more from your side:",
      "",
      ...outstanding.map((item) => `- ${item}`),
      "",
      "Reply to this email and we'll get it scheduled.",
      "",
      "- iqcommune",
    ),
  };
}

/** The console's "Send cancellation message" for a request that fell through. */
export function sessionRequestCancelled(to: string, firstName: string): EmailMessage {
  return {
    template: "session-request-cancelled",
    stream: "session",
    to,
    subject: "Your session request",
    body: lines(
      `Hi ${firstName},`,
      "",
      "We're sorry - we aren't able to take your session request forward at this time.",
      "",
      "If circumstances change, or you'd like to discuss a different date or format, just reply here and we'll pick it back up.",
      "",
      "- iqcommune",
    ),
  };
}

export function newSessionRequestForAdmin(to: string, summary: string): EmailMessage {
  return {
    template: "new-session-request-admin",
    stream: "session",
    to,
    subject: "New session request",
    body: lines("A new session request has come in:", "", summary),
  };
}

export function ratingRequest(to: string, firstName: string, assignmentId: string): EmailMessage {
  return {
    template: "rating-request",
    stream: "session",
    to,
    subject: "How was your session?",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Your feedback helps us maintain quality across our practitioner network - it takes less than a minute.",
      "",
      buildLink("rate", assignmentId),
      "",
      "- iqcommune",
    ),
  };
}

export function consentRequest(to: string, firstName: string, assignmentId: string): EmailMessage {
  return {
    template: "consent-request",
    stream: "session",
    to,
    subject: "Confirm your session details",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Please review your session details and the stated payout, and provide your consent to confirm.",
      "",
      buildLink("consent", assignmentId),
      "",
      "- iqcommune",
    ),
  };
}

export function photoReminder(to: string, firstName: string, assignmentId: string): EmailMessage {
  // Carries the shot ideas ahead of the session, not just the link (audit G4b):
  // the procedure wants the practitioner to have them ready before they need them.
  const shots = SESSION_SHOTS.map((shot, index) => `${index + 1}. ${shot.label} — ${shot.note}`);
  return {
    template: "photo-reminder",
    // Sent to a practitioner, but about a session — and the reply ("which
    // session is this?") belongs with whoever runs sessions.
    stream: "session",
    to,
    subject: "Your session photos — shot guide and upload link",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Ahead of your session, here are the eight shots that make a session gallery look great —",
      "keep this handy so you have them ready on the day:",
      "",
      ...shots,
      "",
      "When the session wraps, upload them here (bookmark it now):",
      "",
      buildLink("photos", assignmentId),
      "",
      "- iqcommune",
    ),
  };
}

export function onboardingLink(to: string, firstName: string, agreementId: string): EmailMessage {
  return {
    template: "onboarding-link",
    stream: "practitioner",
    to,
    subject: "Welcome to the iqcommune practitioner network",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Please review and sign your empanelment agreement.",
      "",
      buildLink("onboarding", agreementId),
      "",
      "- iqcommune",
    ),
  };
}

export function adminInvite(to: string, inviteId: string): EmailMessage {
  return {
    template: "admin-invite",
    to,
    subject: "Set up your iqcommune account",
    body: lines(
      "You have been invited to the iqcommune admin console.",
      "",
      "Confirm your details and choose a password to activate your account:",
      "",
      buildLink("invite", inviteId),
      "",
      "This link can only be used once.",
      "",
      "- iqcommune",
    ),
  };
}

/**
 * Internal notifications (audit G4a). The procedure names welcome, rejection and
 * deactivation as a distinct class of message — sent immediately with no undo
 * hold (audit G4c), unlike the external link emails. They carry no tokenised
 * link, just news of a decision.
 */

/** Exact copy from the client's request-acknowledgment spec, same as
 *  `sessionRequestReceived` above. */
export function applicationReceived(to: string, firstName: string): EmailMessage {
  return {
    template: "application-received",
    stream: "practitioner",
    to,
    subject: "iqcommune — we've received your application",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Thanks for applying to join the iqcommune practitioner network — we've received your application.",
      "",
      "We'll go through it and reach out within 2–3 working days for a short, informal conversation. Nothing to prepare — just a chance for us to understand each other a little better.",
      "",
      "Regards,",
      "The iqcommune Team",
    ),
  };
}

export function practitionerWelcome(to: string, firstName: string): EmailMessage {
  return {
    template: "practitioner-welcome",
    stream: "practitioner",
    to,
    subject: "You're empanelled with iqcommune",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Welcome aboard - your empanelment is confirmed and you're now part of the iqcommune",
      "practitioner network. We'll be in touch with your first session details soon.",
      "",
      "- iqcommune",
    ),
  };
}

export function applicationRejected(to: string, firstName: string): EmailMessage {
  return {
    template: "application-rejected",
    stream: "practitioner",
    to,
    subject: "An update on your iqcommune application",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Thank you for your interest in the iqcommune practitioner network. After review, we're",
      "not able to move forward with your application at this time. We genuinely appreciate the",
      "time you took to apply, and we wish you the very best.",
      "",
      "- iqcommune",
    ),
  };
}

export function practitionerDeactivated(to: string, firstName: string): EmailMessage {
  return {
    template: "practitioner-deactivated",
    stream: "practitioner",
    to,
    subject: "Your iqcommune empanelment status",
    body: lines(
      `Hi ${firstName},`,
      "",
      "This is to let you know that your empanelment with iqcommune has been deactivated and you",
      "won't be assigned further sessions. If you believe this is in error, please reply to this",
      "email and we'll take a look.",
      "",
      "- iqcommune",
    ),
  };
}
