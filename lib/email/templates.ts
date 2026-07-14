const BASE = `font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:14px;line-height:1.7`;
const GOLD_BTN = `display:inline-block;background:#c9982a;color:#14161d;padding:13px 28px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px`;
const TABLE_CELL_L = `padding:7px 12px;background:#f5e9c8;font-weight:600;font-size:13px;width:40%`;
const TABLE_CELL_R = `padding:7px 12px;background:#f8f7f4;font-size:13px`;

/** HTML-encode characters that are meaningful inside element content or attribute values. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Safe URL for href attributes — blocks javascript: and data: URIs.
 * esc() alone won't stop protocol-based XSS because "javascript:..." has no HTML-special chars.
 */
function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return "#";
  } catch {
    return "#";
  }
  return esc(url);
}

/** Strip CR/LF before embedding in an email Subject header to prevent header injection. */
function escSubject(s: string): string {
  return esc(s).replace(/[\r\n]+/g, "");
}

function row(label: string, value: string) {
  return `<tr><td style="${TABLE_CELL_L}">${esc(label)}</td><td style="${TABLE_CELL_R}">${esc(value)}</td></tr>`;
}

export function availabilityCheckEmail(
  practitionerName: string,
  request: {
    topic: string;
    audienceType: string;
    groupSize: string;
    preferredDates: string;
    city?: string;
  }
): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  return {
    subject: "iqcommune — Availability check for a session request",
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>We have a session request that matches your module. Before we confirm anything, wanted to check if the timing works for you.</p>
<table style="border-collapse:collapse;width:100%;margin:1rem 0">
  ${row("Module", request.topic)}
  ${row("Audience", `${request.audienceType} · ${request.groupSize} participants`)}
  ${row("Preferred dates", request.preferredDates)}
  ${request.city ? row("City", request.city) : ""}
</table>
<p>If you're available, reply with a preferred date and time — we'll confirm the booking. No worries if the timing doesn't work.</p>
<p>Warm regards,<br/>iqcommune team<br/><a href="mailto:hello@iqcommune.com">hello@iqcommune.com</a></p>
</div>`,
  };
}

export function agreementLinkEmail(
  practitionerName: string,
  onboardingUrl: string
): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  // onboardingUrl is HMAC-signed by the server — safe to embed as href
  return {
    subject: "iqcommune — Your empanelment agreement is ready to sign",
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>We're delighted to have you on board. Your empanelment agreement is ready for review and signature.</p>
<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(onboardingUrl)}" style="${GOLD_BTN}">Review &amp; Sign Agreement →</a>
</div>
<p style="font-size:12px;color:#9496a1">This link is personal and single-use. If you have questions before signing, reply to this email.</p>
<p>Warm regards,<br/>iqcommune team</p>
</div>`,
  };
}

export function clientFollowUpEmail(
  clientName: string,
  request: {
    topic: string;
    groupSize: string;
    audienceType: string;
    preferredDates: string;
  }
): { subject: string; htmlContent: string } {
  const first = esc(clientName.split(" ")[0] || "there");
  return {
    subject: "iqcommune — Update on your training session request",
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>Thank you for your interest in iqcommune. We've reviewed your request for a session on <strong>${esc(request.topic)}</strong>.</p>
<p>We're aligning a practitioner for your group and will confirm session details within 2–3 working days.</p>
<p style="font-size:13px;color:#4a4d5c">${esc(request.groupSize)} participants · ${esc(request.audienceType)}<br/>Preferred: ${esc(request.preferredDates)}</p>
<p>Warm regards,<br/>iqcommune team<br/><a href="mailto:hello@iqcommune.com">hello@iqcommune.com</a></p>
</div>`,
  };
}

export function sessionCancelledEmail(
  clientName: string,
  session: { topic: string; sessionRef?: string },
): { subject: string; htmlContent: string } {
  const first = esc(clientName.split(" ")[0] || "there");
  return {
    subject: "iqcommune — Your training session has been cancelled",
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>We're writing to let you know that your confirmed session on <strong>${esc(session.topic)}</strong>${session.sessionRef ? ` (${esc(session.sessionRef)})` : ""} has been cancelled.</p>
<p>We're sorry for any inconvenience. If you'd like to reschedule or arrange a session on another topic, simply reply to this email and we'll set it up for you.</p>
<p>Warm regards,<br/>iqcommune team<br/><a href="mailto:hello@iqcommune.com">hello@iqcommune.com</a></p>
</div>`,
  };
}

export function applicationConfirmation({
  name,
  ref,
  modules,
  statusUrl,
}: {
  name: string;
  ref: string;
  modules: string[];
  statusUrl?: string;
}): { subject: string; htmlContent: string } {
  const first = esc(name.split(" ")[0] || "there");
  const statusBtn = statusUrl
    ? `<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(statusUrl)}" style="${GOLD_BTN}">Track your application →</a>
</div>`
    : "";
  return {
    subject: `iqcommune — Application received (${escSubject(ref)})`,
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>Thank you for applying to become an iqcommune practitioner. We've received your application and will review it shortly.</p>
<p><strong>Modules applied for:</strong><br>${modules.map(esc).join("<br>")}</p>
${statusBtn}
<p>We'll be in touch within 3–5 working days. For questions, email <a href="mailto:practitioners@iqcommune.com">practitioners@iqcommune.com</a></p>
<p>Warm regards,<br>iqcommune team</p>
</div>`,
  };
}

export function agreementConfirmed({
  name,
  ref,
}: {
  name: string;
  ref: string;
}): { subject: string; htmlContent: string } {
  const first = esc(name.split(" ")[0] || "there");
  return {
    subject: "Your iqcommune practitioner agreement is confirmed",
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>Your empanelment agreement (Ref: IQC-EMP-${esc(ref)}) has been signed and is now on record.</p>
<p>Our coordinator will be in touch with session scheduling details. Welcome to the iqcommune practitioner network!</p>
<p>Warm regards,<br>iqcommune team</p>
</div>`,
  };
}

export function photoReceived({
  practitionerName,
  sessionRef,
  expiryDate,
}: {
  practitionerName: string;
  sessionRef: string;
  expiryDate: string;
}): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  return {
    subject: `iqcommune — Photos received for ${escSubject(sessionRef)}`,
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>We've received your session photos for <strong>${esc(sessionRef)}</strong>. Our team will review them within 3–5 business days.</p>
<p>Photos will be retained until <strong>${esc(expiryDate)}</strong>.</p>
<p>Warm regards,<br>iqcommune team</p>
</div>`,
  };
}

export function photoApproved({
  practitionerName,
  sessionRef,
}: {
  practitionerName: string;
  sessionRef: string;
}): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  return {
    subject: `iqcommune — Your session photos have been published`,
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>The photos from session <strong>${esc(sessionRef)}</strong> have been reviewed and published. Thank you for sharing them!</p>
<p>Warm regards,<br>iqcommune team</p>
</div>`,
  };
}

export function payoutPaid({
  practitionerName,
  invoiceRef,
  amountInr,
}: {
  practitionerName: string;
  invoiceRef: string;
  amountInr: number;
}): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  return {
    subject: `iqcommune — Payment sent (${escSubject(invoiceRef)})`,
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>Your payout of <strong>₹${amountInr.toLocaleString("en-IN")}</strong> has been processed.</p>
<table style="border-collapse:collapse;width:100%;margin:1rem 0">
  ${row("Invoice ref.", invoiceRef)}
</table>
<p>Warm regards,<br>iqcommune team</p>
</div>`,
  };
}

export function sessionConfirmationEmail(
  practitionerName: string,
  session: {
    refCode: string;
    module: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    participants: number;
    grossAmount: number;
    tdsAmount: number;
    netAmount: number;
    tdsRate: number;
    consentUrl: string;
  }
): { subject: string; htmlContent: string } {
  const first = esc(practitionerName.split(" ")[0] || "there");
  return {
    subject: `iqcommune — Session Confirmation: ${escSubject(session.refCode)}`,
    htmlContent: `<div style="${BASE}">
<p>Hi ${first},</p>
<p>The following session has been confirmed. Please review the details and provide your digital consent via the link below to lock the booking.</p>
<table style="border-collapse:collapse;width:100%;margin:1rem 0">
  ${row("Session ref.", session.refCode)}
  ${row("Module", session.module)}
  ${row("Date", session.date)}
  ${row("Time", `${session.startTime} – ${session.endTime}`)}
  ${row("Venue", session.venue)}
  ${row("Participants", String(session.participants))}
</table>
<p style="font-weight:600;margin-top:1.5rem">Payout breakdown</p>
<table style="border-collapse:collapse;width:100%;margin:.5rem 0">
  ${row("Session fee", `₹${session.grossAmount.toLocaleString("en-IN")}`)}
  ${row(`TDS (${session.tdsRate}%)`, `−₹${session.tdsAmount.toLocaleString("en-IN")}`)}
  ${row("Net payout", `₹${session.netAmount.toLocaleString("en-IN")}`)}
</table>
<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(session.consentUrl)}" style="${GOLD_BTN}">Provide Digital Consent →</a>
</div>
<p style="font-size:12px;color:#9496a1">The session is not confirmed until you provide consent. This link expires in 48 hours.</p>
<p>Warm regards,<br/>iqcommune team</p>
</div>`,
  };
}

// ── Internal admin notifications ─────────────────────────────────────────────
// Sent to the ops inbox (not the applicant/client) when a new record lands, so
// admins don't have to poll the console. row() escapes label + value.

export function newApplicationAdminEmail({
  name,
  ref,
  role,
  experience,
  city,
  state,
  modules,
  email,
  phone,
  consoleUrl,
}: {
  name: string;
  ref: string;
  role: string;
  experience: string;
  city: string;
  state: string;
  modules: string[];
  email: string;
  phone: string;
  consoleUrl: string;
}): { subject: string; htmlContent: string } {
  return {
    subject: `iqcommune [admin] — New practitioner application: ${escSubject(name)} (${escSubject(ref)})`,
    htmlContent: `<div style="${BASE}">
<p>A new practitioner application was submitted.</p>
<table style="border-collapse:collapse;width:100%;margin:1rem 0">
  ${row("Applicant", name)}
  ${row("Ref.", ref)}
  ${row("Role", role)}
  ${row("Experience", experience)}
  ${row("Location", `${city}, ${state}`)}
  ${row("Modules", modules.join(", "))}
  ${row("Email", email)}
  ${row("Phone", phone)}
</table>
<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(consoleUrl)}" style="${GOLD_BTN}">Review in console →</a>
</div>
<p style="font-size:12px;color:#9496a1">Automated notification — no reply needed.</p>
</div>`,
  };
}

export function adminInviteEmail({
  inviteUrl,
  roleLabel,
  ttlDays,
}: {
  inviteUrl: string;
  roleLabel: string;
  ttlDays: number;
}): { subject: string; htmlContent: string } {
  // inviteUrl is HMAC-signed by the server — safe to embed as href.
  return {
    subject: "iqcommune — You've been invited to the admin console",
    htmlContent: `<div style="${BASE}">
<p>Hi there,</p>
<p>You've been invited to join the iqcommune admin console as <strong>${esc(roleLabel)}</strong>.</p>
<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(inviteUrl)}" style="${GOLD_BTN}">Accept invite &amp; set up access →</a>
</div>
<p style="font-size:12px;color:#9496a1">This invite is single-use and expires in ${ttlDays} days. If you weren't expecting it, you can safely ignore this email.</p>
<p>Warm regards,<br/>iqcommune team</p>
</div>`,
  };
}

export function newSessionRequestAdminEmail({
  name,
  topic,
  audienceType,
  groupSize,
  orgName,
  city,
  state,
  preferredDates,
  email,
  phone,
  consoleUrl,
}: {
  name: string;
  topic: string;
  audienceType: string;
  groupSize: string;
  orgName?: string;
  city: string;
  state: string;
  preferredDates: string;
  email: string;
  phone: string;
  consoleUrl: string;
}): { subject: string; htmlContent: string } {
  return {
    subject: `iqcommune [admin] — New session request: ${escSubject(topic)}`,
    htmlContent: `<div style="${BASE}">
<p>A new session request was submitted.</p>
<table style="border-collapse:collapse;width:100%;margin:1rem 0">
  ${row("Requester", name)}
  ${row("Topic", topic)}
  ${row("Audience", groupSize ? `${audienceType} · ${groupSize}` : audienceType)}
  ${orgName ? row("Organisation", orgName) : ""}
  ${row("Location", `${city}, ${state}`)}
  ${row("Preferred dates", preferredDates)}
  ${row("Email", email)}
  ${row("Phone", phone)}
</table>
<div style="text-align:center;margin:2rem 0">
  <a href="${safeHref(consoleUrl)}" style="${GOLD_BTN}">Review in console →</a>
</div>
<p style="font-size:12px;color:#9496a1">Automated notification — no reply needed.</p>
</div>`,
  };
}
