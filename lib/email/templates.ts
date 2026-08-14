import { SESSION_SHOTS } from "@/constants/photo-shots";
import { SESSION_REQUEST_ACK } from "@/content/session-request";
import { siteUrl } from "@/lib/siteUrl";

import { escapeHtml, safeHref } from "./html";
import { buildLink } from "./links";
import type { EmailMessage } from "./send";

/**
 * How a body signs off — one signature on every email (client, 2026-08-13),
 * as the two-line block the console-messages document specifies (rev 2,
 * 2026-08-14). It replaced a single hyphenated line; `SIGN_OFF_TEAM` is the
 * bare name, kept for the two acknowledgment emails whose copy is client
 * verbatim and already carries its own "Regards," line.
 *
 * Supersedes the per-stream sign-off of 2026-08-10, where session mail signed
 * "Session Commune" and practitioner mail "Practitioner Commune". The client
 * asked for one consistent signature, generalising the wording already approved
 * for `sessionRequestReceived` below.
 *
 * The body signature and the From line therefore differ by design now. The
 * envelope still carries the stream's own name via `senderNameFor` (send.ts),
 * so a reply still reaches the mailbox whose job it is, while every body signs
 * the same way. The 2026-08-10 note called that drift the failure to prevent —
 * it is now the requirement, so move both together if this is reconsidered.
 *
 * Only the signature is shared. "iqcommune" elsewhere in these bodies names the
 * organisation — "the iqcommune practitioner network", "your empanelment with
 * iqcommune" — and is left alone.
 */
const SIGN_OFF = "Warm regards,\nTeam iqcommune";
const SIGN_OFF_TEAM = "Team iqcommune";

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

/**
 * Exact copy from the client's confirmations delivery (2026-08-14), which
 * supersedes the interest-acknowledgment wording of 2026-08-12 — subject and
 * body specified verbatim, not the house style used elsewhere in this file.
 *
 * Subject and paragraphs come from `content/session-request.ts`, which also
 * holds the standard-phase version the client has on deck and the popup wording
 * that must not drift from this. Only the greeting and the sign-off are added
 * here, because those belong to the email and not to the acknowledgment.
 *
 * The waitlist version still promises no reply window, for the client's own
 * reason: sessions are not scheduled on arrival during this phase, so the
 * commitment is to the practitioner mapping rather than to a date. The standard
 * version restores the 2–3 day window, which is what makes it the version for
 * after the phase ends.
 *
 * Its sign-off used to be the lone hardcoded "Team iqcommune" while every other
 * body signed per-stream. The client generalised this one to all of them on
 * 2026-08-13, so it reads from `SIGN_OFF_TEAM` like the rest.
 */
export function sessionRequestReceived(to: string, firstName: string, topic: string): EmailMessage {
  return {
    template: "session-request-received",
    stream: "session",
    to,
    subject: SESSION_REQUEST_ACK.subject,
    body: lines(
      `Dear ${firstName},`,
      ...SESSION_REQUEST_ACK.paragraphs(topic).flatMap((paragraph) => ["", paragraph]),
      "",
      "Regards,",
      SIGN_OFF_TEAM,
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
  request: RequestEcho,
): EmailMessage {
  return {
    template: "session-request-follow-up",
    stream: "session",
    to,
    subject: "iqcommune — following up on your session request",
    body: lines(
      `Dear ${firstName},`,
      "",
      `Thank you for your interest in iqcommune, and for your request for a session on ${request.topic}.`,
      "",
      "We are ready to move ahead and need a little more from your side:",
      "",
      ...outstanding.map((item) => `- ${item}`),
      "",
      "Please reply to this email with the above and we will take it forward.",
      "",
      "Your request as it stands:",
      ...requestEchoRows(request),
      "",
      SIGN_OFF,
    ),
  };
}

/**
 * What the follow-up echoes back, so the reader can see what we hold without
 * digging out their own submission.
 *
 * Optional rows are dropped rather than shown empty — and a field that is
 * outstanding is by definition one we do not have, so an echo that printed
 * "Group: participants" would be contradicting the list directly above it.
 */
export interface RequestEcho {
  topic: string;
  /** Already resolved through AUDIENCE_LABELS — the enum never reaches a body. */
  audience: string;
  groupSize?: string;
  preferredWindow?: string;
}

function requestEchoRows(request: RequestEcho): string[] {
  return [
    `Topic: ${request.topic}`,
    request.groupSize
      ? `Group: ${request.groupSize} participants, ${request.audience}`
      : `Group: ${request.audience}`,
    ...(request.preferredWindow ? [`Preferred window: ${request.preferredWindow}`] : []),
  ];
}

/**
 * The console's "Send cancellation message" — a request that will not be taken
 * forward, before anything was ever matched or scheduled.
 *
 * Deliberately does not use the word "cancelled": nothing was booked, and a
 * message announcing a cancelled session to someone who never had one is the
 * defect this template was split away from `sessionCancelled` to prevent
 * (console-messages doc, rev 2).
 */
export function sessionRequestCancelled(to: string, firstName: string, topic: string): EmailMessage {
  return {
    template: "session-request-cancelled",
    stream: "session",
    to,
    subject: "iqcommune — update on your session request",
    body: lines(
      `Dear ${firstName},`,
      "",
      "Thank you for your interest in iqcommune, and for taking the time to tell us what your group needs.",
      "",
      `We are sorry to say that we are not able to take your request for a session on ${topic} forward at this time.`,
      "",
      "If circumstances change, or you would like to discuss a different date or format, please reply to this email and we will gladly pick it back up.",
      "",
      SIGN_OFF,
    ),
  };
}

/** The status dropdown's "Cancelled" — a session that was already confirmed. */
export function sessionCancelled(
  to: string,
  firstName: string,
  module: string,
  sessionReference: string,
): EmailMessage {
  return {
    template: "session-cancelled",
    stream: "session",
    to,
    subject: "iqcommune — your session has been cancelled",
    body: lines(
      `Dear ${firstName},`,
      "",
      `We are writing to inform you that your confirmed session on ${module} (ref. ${sessionReference}) has been cancelled.`,
      "",
      "If this was unexpected, or you would like to reschedule, please reply to this email and we will assist. We apologise for any inconvenience caused.",
      "",
      SIGN_OFF,
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
      SIGN_OFF,
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

/**
 * Exact copy from the client's confirmations delivery (2026-08-14), which
 * rewrote this one to the same register as the rest of that review: "Dear"
 * rather than "Hi", and full forms rather than contractions.
 *
 * The status link survives the rewrite. The delivery reviews wording and does
 * not reproduce the link, but the link is not wording — the client asked for it
 * separately, as somewhere to check back rather than wait on the next email. A
 * copy review that does not mention a feature is not an instruction to remove it.
 */
const APPLICATION_RECEIVED = {
  thanks: "Thank you for applying to join the iqcommune practitioner network. We have received your application.",
  next:
    "We will review it and reach out within 2–3 working days for a short, informal conversation. " +
    "There is nothing to prepare — simply an opportunity for us to get to know each other a little better.",
} as const;

export function applicationReceived(to: string, firstName: string, applicationId: string): EmailMessage {
  const link = buildLink("status", applicationId);
  return {
    template: "application-received",
    stream: "practitioner",
    to,
    subject: "iqcommune — we have received your application",
    body: lines(
      `Dear ${firstName},`,
      "",
      APPLICATION_RECEIVED.thanks,
      "",
      APPLICATION_RECEIVED.next,
      "",
      "Track your application:",
      link,
      "",
      // "Warm regards," since the client's recommendation was taken (console
      // doc, Appendix A): one signature across every stream. The session-request
      // acknowledgment keeps its plain "Regards," because the same appendix
      // records that copy as client-approved word for word and exempt.
      SIGN_OFF,
    ),
    html:
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:15px;line-height:1.7">` +
      `<p>Dear ${escapeHtml(firstName)},</p>` +
      `<p>${APPLICATION_RECEIVED.thanks}</p>` +
      `<p>${APPLICATION_RECEIVED.next}</p>` +
      goldButton(link, "Track your application →") +
      `<p>Warm regards,<br>${escapeHtml(SIGN_OFF_TEAM)}</p>` +
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
      SIGN_OFF,
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

/**
 * Addressed to the person who asked for the session, not the practitioner who
 * delivered it — the rating is about the practitioner, and the linked page says
 * in as many words that it is never shared with them.
 */
export function ratingRequest(
  to: string,
  firstName: string,
  assignmentId: string,
  session: { module: string; practitionerName: string },
): EmailMessage {
  return {
    template: "rating-request",
    stream: "session",
    to,
    subject: "iqcommune — quick feedback on your recent session?",
    body: lines(
      `Dear ${firstName},`,
      "",
      `We hope the session on ${session.module} with ${session.practitionerName} was valuable for your group.`,
      "",
      "We would appreciate a brief rating for the practitioner, to help us maintain quality across our practitioner network. It takes less than a minute:",
      "",
      buildLink("rate", assignmentId),
      "",
      "Your rating is shared internally with iqcommune only — never with the practitioner directly. The link expires in 14 days.",
      "",
      "Thank you for your time.",
      "",
      SIGN_OFF,
    ),
  };
}

/**
 * No session date in the body on purpose: a consent request can go out before a
 * date is fixed, so the date lives on the linked page where it is always
 * current. Copy that named one here would sometimes name nothing.
 */
export function consentRequest(
  to: string,
  firstName: string,
  assignmentId: string,
  session: { module: string; sessionReference: string; confirmationReference: string },
): EmailMessage {
  return {
    template: "consent-request",
    stream: "session",
    to,
    subject: `iqcommune — please confirm your session details (Ref. ${session.confirmationReference})`,
    body: lines(
      `Dear ${firstName},`,
      "",
      `Please find below the revenue confirmation for your upcoming session on ${session.module} (session ref. ${session.sessionReference}). Kindly review the session details and the payout figure, then confirm your consent using the link below:`,
      "",
      buildLink("consent", assignmentId),
      "",
      "Confirming here locks the session in on our end, so please review the details carefully before proceeding. The link expires in 7 days.",
      "",
      `Confirmation reference: ${session.confirmationReference}`,
      "",
      SIGN_OFF,
    ),
  };
}

export function photoReminder(
  to: string,
  firstName: string,
  assignmentId: string,
  module: string,
): EmailMessage {
  // Carries the shot ideas ahead of the session, not just the link (audit G4b):
  // the procedure wants the practitioner to have them ready before they need them.
  // One list, three surfaces — this email, the upload page's checklist and the
  // confirmation PDF — so the wording is owned by the constant, not by any of them.
  // Colon, not a dash: half the labels contain a dash of their own, and
  // "Candid — Q&A or discussion moment — Natural interaction" reads as three
  // things rather than a shot and its note.
  const shots = SESSION_SHOTS.map((shot, index) => `${index + 1}. ${shot.label}: ${shot.note}`);
  return {
    template: "photo-reminder",
    // Sent to a practitioner, but about a session — and the reply ("which
    // session is this?") belongs with whoever runs sessions.
    stream: "session",
    to,
    subject: "iqcommune — your session photos: shot guide and upload link",
    body: lines(
      `Dear ${firstName},`,
      "",
      `Ahead of your session on ${module}, we would appreciate a few photographs from the room for our website, if convenient. Phone photographs are entirely sufficient.`,
      "",
      "Here are the eight shots that make a session gallery look great — keep this handy so you have them ready on the day:",
      "",
      ...shots,
      "",
      "When the session wraps, upload them using this link — bookmark it now:",
      "",
      buildLink("photos", assignmentId),
      "",
      "Thank you in advance.",
      "",
      SIGN_OFF,
    ),
  };
}

/**
 * `agreementReference` is the agreement's own IQC-AGR reference, not the
 * practitioner's IQC-EMP one — they are separate sequences and quoting the
 * wrong one here sends someone looking for a document that does not exist.
 */
export function onboardingLink(
  to: string,
  firstName: string,
  agreementId: string,
  agreementReference: string,
): EmailMessage {
  return {
    template: "onboarding-link",
    stream: "practitioner",
    to,
    subject: `iqcommune — your empanelment agreement (Ref. ${agreementReference})`,
    body: lines(
      `Dear ${firstName},`,
      "",
      "Your empanelment agreement is ready, prefilled with the details you shared with us. Please review it and sign online using the link below:",
      "",
      buildLink("onboarding", agreementId),
      "",
      "It takes only a couple of minutes — review the terms, then sign directly on the page. The link is unique to you and expires in 14 days; if it lapses, reply here and we will send a fresh one.",
      "",
      `Reference for this agreement: ${agreementReference}`,
      "",
      "Please let us know if anything requires clarification before signing.",
      "",
      SIGN_OFF,
    ),
  };
}

/** `roleLabel` is what a person says — "Global Admin", "Admin", "User". */
export function adminInvite(to: string, inviteId: string, roleLabel: string): EmailMessage {
  return {
    template: "admin-invite",
    to,
    subject: "iqcommune — you've been invited to the admin console",
    body: lines(
      "Dear Team Member,",
      "",
      `You have been invited to join the iqcommune admin console as ${roleLabel}.`,
      "",
      "Please set up your account and choose a password using the link below:",
      "",
      buildLink("invite", inviteId),
      "",
      "This link can only be used once, and the invitation expires in 72 hours. If it lapses, ask whoever invited you to send a fresh one.",
      "",
      SIGN_OFF,
    ),
  };
}

/**
 * Internal notifications (audit G4a). The procedure names welcome, rejection and
 * deactivation as a distinct class of message — sent immediately with no undo
 * hold (audit G4c), unlike the external link emails. They carry no tokenised
 * link, just news of a decision.
 */

/**
 * The availability promise in the second paragraph is the client's, and the
 * practitioner pages and the empanelment agreement both make it too — but no
 * availability-check message exists in the console yet (console-messages doc,
 * rev 2, B2). The copy is what was approved; the mechanism is outstanding.
 */
export function practitionerWelcome(
  to: string,
  firstName: string,
  practitionerReference: string,
): EmailMessage {
  return {
    template: "practitioner-welcome",
    stream: "practitioner",
    to,
    subject: "Welcome to iqcommune — you're officially empanelled",
    body: lines(
      `Dear ${firstName},`,
      "",
      "We are pleased to confirm that your signed agreement is in, and you are now officially empanelled as an iqcommune practitioner.",
      "",
      "As session requests come in that match your profile and city, we will reach out to check your availability before confirming anything. You are never obligated to accept a session, and there is no minimum commitment on your end. We will be in touch with your first session details as soon as we have a match.",
      "",
      `Your empanelment reference: ${practitionerReference}`,
      "",
      "If any of your details change, please let us know and we will update them on our end.",
      "",
      "We look forward to working with you.",
      "",
      SIGN_OFF,
    ),
  };
}

export function applicationRejected(to: string, firstName: string): EmailMessage {
  return {
    template: "application-rejected",
    stream: "practitioner",
    to,
    subject: "iqcommune — update on your practitioner application",
    body: lines(
      `Dear ${firstName},`,
      "",
      "Thank you for your interest in joining iqcommune, and for the time you invested through the application and screening process.",
      "",
      "After careful review, we will not be moving forward with your application at this time. This is not a reflection of your expertise — we are often working within a specific mix of modules, cities and experience bands at any given time, and this can change as our requirements evolve.",
      "",
      "We would genuinely welcome a future application should circumstances change, and we wish you the very best.",
      "",
      SIGN_OFF,
    ),
  };
}

/**
 * The console has one control here, so one message covers it. The practitioner
 * record distinguishes Paused from Deactivated; if those ever become separate
 * sends, the paused one needs copy of its own rather than reusing this.
 */
export function practitionerDeactivated(to: string, firstName: string): EmailMessage {
  return {
    template: "practitioner-deactivated",
    stream: "practitioner",
    to,
    subject: "iqcommune — a quick update on your practitioner status",
    body: lines(
      `Dear ${firstName},`,
      "",
      "This is to inform you that we have paused matching you to new sessions for the time being.",
      "",
      "This does not affect any existing arrangement — your signed agreement and session history remain unchanged. Should your circumstances change and you wish to be considered again, please let us know and we will reactivate your profile.",
      "",
      "If you believe this has happened in error, please reply to this email and we will take a look.",
      "",
      "Thank you for your contribution so far.",
      "",
      SIGN_OFF,
    ),
  };
}
