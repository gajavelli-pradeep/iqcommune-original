const BASE = `font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f1117;font-size:14px;line-height:1.7`;
const GOLD_BTN = `display:inline-block;background:#c9982a;color:#fff;padding:13px 28px;border-radius:100px;text-decoration:none;font-weight:600;font-size:15px`;
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
  const first = esc(practitionerName.split(" ")[0]);
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
  const first = esc(practitionerName.split(" ")[0]);
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
  const first = esc(clientName.split(" ")[0]);
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
  const first = esc(practitionerName.split(" ")[0]);
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
