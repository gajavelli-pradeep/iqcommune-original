import { SESSION_SHOTS } from "@/constants/photo-shots";
import { siteUrl } from "@/lib/siteUrl";

import { escapeHtml, safeHref } from "./html";
import { buildLink } from "./links";
import { senderNameFor, type EmailMessage, type EmailStream } from "./send";

/**
 * How a body signs off — the stream's own name (client, 2026-08-10): session
 * mail signs "Session Commune", practitioner mail "Practitioner Commune".
 *
 * Resolved through `senderNameFor` rather than written out, so the sign-off is
 * always the same name the recipient sees in the From line. The two saying
 * different things is the failure this prevents.
 *
 * Only the sign-off moves. "iqcommune" elsewhere in these bodies names the
 * organisation — "the iqcommune practitioner network", "your empanelment with
 * iqcommune" — and substituting there would produce "the Practitioner Commune
 * practitioner network".
 */
const signOff = (stream: EmailStream) => `- ${senderNameFor(stream)}`;
const signOffTeam = (stream: EmailStream) => `The ${senderNameFor(stream)} Team`;

/**
 * Plain-text templates — plus, where a template carries a link worth turning
 * into a real call to action, an `html` counterpart (see `applicationReceived`).
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

/** components/ui/Button.tsx's `gold` variant (rounded-full bg-gold text-ink),
 *  inlined: email clients don't run Tailwind or resolve CSS custom properties,
 *  the same reason app/opengraph-image.tsx keeps its own literals. */
const GOLD_BUTTON_STYLE =
  "display:inline-block;background:#c9982a;color:#0f1117;padding:13px 28px;" +
  "border-radius:100px;text-decoration:none;font-weight:600;font-size:15px;" +
  "font-family:Arial,Helvetica,sans-serif";

/** A centered button, table-wrapped: Outlook's Word rendering engine drops
 *  padding on a bare inline `<a>`, but respects it on a table cell. */
function goldButton(href: string, label: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td align="center" style="padding:24px 0 28px 0">` +
    `<a href="${safeHref(href)}" style="${GOLD_BUTTON_STYLE}">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

const TABLE_CELL_LABEL = "padding:7px 12px;background:#f5e9c8;font-weight:600;font-size:13px;width:40%";
const TABLE_CELL_VALUE = "padding:7px 12px;background:#f8f7f4;font-size:13px";

/** One label/value row in an admin summary table. The tints are literal
 *  because email clients don't resolve custom properties (see
 *  GOLD_BUTTON_STYLE above) — they match --color-gold-light/--color-surface-soft. */
function detailRow(label: string, value: string): string {
  return (
    `<tr><td style="${TABLE_CELL_LABEL}">${escapeHtml(label)}</td>` +
    `<td style="${TABLE_CELL_VALUE}">${escapeHtml(value)}</td></tr>`
  );
}

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
      signOffTeam("session"),
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
      signOff("session"),
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
      signOff("session"),
    ),
  };
}

export interface SessionRequestSummary {
  firstName: string;
  lastName: string;
  /** Friendly label — the caller resolves the enum via AUDIENCE_LABELS, this
   *  template only ever shows what a person submitted. */
  audience: string;
  topic: string;
  organisationName?: string;
  groupSize?: string;
  city: string;
  state: string;
  preferredWindow?: string;
  email: string;
  phone: string;
}

export function newSessionRequestForAdmin(to: string, request: SessionRequestSummary): EmailMessage {
  const name = `${request.firstName} ${request.lastName}`;
  const consoleUrl = `${siteUrl()}/console?tab=requests`;

  return {
    template: "new-session-request-admin",
    stream: "session",
    to,
    subject: `New session request: ${request.topic}`,
    body: lines(
      "A new session request was submitted.",
      "",
      `Requester: ${name}`,
      `Topic: ${request.topic}`,
      `Audience: ${request.audience}`,
      ...(request.organisationName ? [`Organisation: ${request.organisationName}`] : []),
      ...(request.groupSize ? [`Group size: ${request.groupSize}`] : []),
      `Location: ${request.city}, ${request.state}`,
      ...(request.preferredWindow ? [`Preferred dates: ${request.preferredWindow}`] : []),
      `Email: ${request.email}`,
      `Phone: ${request.phone}`,
      "",
      `Review in console: ${consoleUrl}`,
      "",
      signOff("session"),
    ),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:15px;line-height:1.7">` +
      `<p>A new session request was submitted.</p>` +
      `<table style="border-collapse:collapse;width:100%;margin:1rem 0">` +
      detailRow("Requester", name) +
      detailRow("Topic", request.topic) +
      detailRow("Audience", request.audience) +
      (request.organisationName ? detailRow("Organisation", request.organisationName) : "") +
      (request.groupSize ? detailRow("Group size", request.groupSize) : "") +
      detailRow("Location", `${request.city}, ${request.state}`) +
      (request.preferredWindow ? detailRow("Preferred dates", request.preferredWindow) : "") +
      detailRow("Email", request.email) +
      detailRow("Phone", request.phone) +
      `</table>` +
      goldButton(consoleUrl, "Review in console →") +
      `<p style="font-size:12px;color:#6f7180">Automated notification — no reply needed.</p>` +
      `</div>`,
  };
}

/** Exact copy from the client's request-acknowledgment spec, same as
 *  `sessionRequestReceived` above — plus a status link the spec did not ask
 *  for but the client separately requested: somewhere to check back rather
 *  than wait on the next email. */
export function applicationReceived(to: string, firstName: string, applicationId: string): EmailMessage {
  const link = buildLink("status", applicationId);
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
      "Track your application:",
      link,
      "",
      "Regards,",
      signOffTeam("practitioner"),
    ),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:15px;line-height:1.7">` +
      `<p>Hi ${escapeHtml(firstName)},</p>` +
      `<p>Thanks for applying to join the iqcommune practitioner network — we've received your application.</p>` +
      `<p>We'll go through it and reach out within 2–3 working days for a short, informal conversation. ` +
      `Nothing to prepare — just a chance for us to understand each other a little better.</p>` +
      goldButton(link, "Track your application →") +
      `<p>Regards,<br>${escapeHtml(signOffTeam("practitioner"))}</p>` +
      `</div>`,
  };
}

export interface ApplicationSummary {
  firstName: string;
  lastName: string;
  jobTitle: string;
  experience: string;
  city: string;
  state: string;
  modules: string[];
  email: string;
  phone: string;
}

export function newApplicationForAdmin(to: string, application: ApplicationSummary): EmailMessage {
  const name = `${application.firstName} ${application.lastName}`;
  const consoleUrl = `${siteUrl()}/console?tab=practitioners`;

  return {
    template: "new-application-admin",
    stream: "practitioner",
    to,
    subject: `New practitioner application: ${name}`,
    body: lines(
      "A new practitioner application was submitted.",
      "",
      `Applicant: ${name}`,
      `Role: ${application.jobTitle}`,
      `Experience: ${application.experience}`,
      `Location: ${application.city}, ${application.state}`,
      `Modules: ${application.modules.join(", ")}`,
      `Email: ${application.email}`,
      `Phone: ${application.phone}`,
      "",
      `Review in console: ${consoleUrl}`,
      "",
      signOff("practitioner"),
    ),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:15px;line-height:1.7">` +
      `<p>A new practitioner application was submitted.</p>` +
      `<table style="border-collapse:collapse;width:100%;margin:1rem 0">` +
      detailRow("Applicant", name) +
      detailRow("Role", application.jobTitle) +
      detailRow("Experience", application.experience) +
      detailRow("Location", `${application.city}, ${application.state}`) +
      detailRow("Modules", application.modules.join(", ")) +
      detailRow("Email", application.email) +
      detailRow("Phone", application.phone) +
      `</table>` +
      goldButton(consoleUrl, "Review in console →") +
      `<p style="font-size:12px;color:#6f7180">Automated notification — no reply needed.</p>` +
      `</div>`,
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
      signOff("session"),
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
      signOff("session"),
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
      signOff("session"),
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
      signOff("practitioner"),
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
      signOff("platform"),
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
      signOff("practitioner"),
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
      signOff("practitioner"),
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
      signOff("practitioner"),
    ),
  };
}
