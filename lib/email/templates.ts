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
  return {
    to,
    subject: "Your session photo link",
    body: lines(
      `Hi ${firstName},`,
      "",
      "Bookmark this link and come back to it during or right after your session to submit photos.",
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
