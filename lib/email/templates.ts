import { SESSION_SHOTS } from "@/constants/photo-shots";

import { buildLink } from "./links";
import type { EmailMessage } from "./send";

/**
 * Plain-text templates.
 *
 * Every link is built by `buildLink`, never assembled here — a template that
 * concatenated an id would put a guessable identifier in a URL, which is the
 * thing ADR 0004 exists to prevent.
 */

const lines = (...parts: string[]) => parts.join("\n");

export function sessionRequestReceived(to: string, firstName: string): EmailMessage {
  return {
    to,
    subject: "We have your session request",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Thanks - your session request is in. We'll be in touch within 2-3 working days.",
      "",
      "- iqcommune",
    ),
  };
}

export function newSessionRequestForAdmin(to: string, summary: string): EmailMessage {
  return {
    to,
    subject: "New session request",
    body: lines("A new session request has come in:", "", summary),
  };
}

export function ratingRequest(to: string, firstName: string, assignmentId: string): EmailMessage {
  return {
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

export function practitionerWelcome(to: string, firstName: string): EmailMessage {
  return {
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
