import { log } from "@/lib/logger";

/**
 * Outbound email — F2.
 *
 * **Dry run unless explicitly enabled.** Nothing is dispatched unless
 * `EMAIL_DELIVERY=live`. A development database full of test rows will happily
 * generate mail to real addresses, and the previous system's practitioners are
 * real people; a misfire is not recoverable by deleting a row. In dry-run mode
 * the rendered message is logged instead, which is also what makes the link in
 * it checkable without sending anything.
 *
 * Delivery is best-effort by design: a request that was written must not fail
 * because a mail provider was slow. Callers pass a trace id so a missing email
 * can be traced back to the request that should have sent it.
 */

/**
 * Which mailbox a message goes out from (client decision, 2026-07-23).
 *
 * Practitioner-pipeline mail comes from practitioner@iqcommune.com and
 * session mail from session@iqcommune.com, so a reply lands with the person
 * whose job it is rather than in one shared inbox. `platform` is everything
 * that is neither — console team invites — and uses the default sender.
 *
 * The stream is declared on the TEMPLATE, not chosen at the call site: which
 * mailbox an email belongs to is a property of the email, and a caller picking
 * it is a caller that can pick wrong.
 */
export type EmailStream = "practitioner" | "session" | "platform";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. HTML templates arrive with the admin console's drafts (P8). */
  body: string;
  /** Defaults to `platform` — the shared sender — when a template omits it. */
  stream?: EmailStream;
}

/** The env var holding each stream's From address. */
const SENDER_ENV: Record<EmailStream, string> = {
  practitioner: "BREVO_SENDER_PRACTITIONER",
  session: "BREVO_SENDER_SESSION",
  platform: "BREVO_SENDER_EMAIL",
};

/**
 * The From address for a stream, falling back to the shared sender.
 *
 * The fallback is the point, not a safety net. The dedicated mailboxes arrive
 * with Google Workspace and then have to be verified with Brevo before Brevo
 * will send as them — sending from an unverified address is rejected outright.
 * So the app ships ready: set the variable when the mailbox is live and mail
 * moves to it with no deploy; leave it unset and everything keeps working from
 * the existing sender.
 */
export function senderFor(stream: EmailStream = "platform"): string | undefined {
  return process.env[SENDER_ENV[stream]] || process.env.BREVO_SENDER_EMAIL;
}

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;

export type SendOutcome =
  | { delivered: true; messageId: string | null }
  | { delivered: false; reason: "dry-run" | "not-configured" | "failed" };

export async function sendEmail(traceId: string, message: EmailMessage): Promise<SendOutcome> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = senderFor(message.stream);

  if (process.env.EMAIL_DELIVERY !== "live") {
    // The rendered body + recipient are what make the link checkable without
    // sending — but only log them OUTSIDE production (audit M9). In production
    // this branch means EMAIL_DELIVERY was left unset by mistake, and the logger
    // contract forbids spilling addresses/names into those logs.
    const inspectable = process.env.NODE_ENV !== "production";
    log.info(traceId, "email not sent — dry run", {
      subject: message.subject,
      // The stream and resolved sender are logged even in production: they
      // carry no personal data, and they are the only way to confirm the
      // routing is right before the mailboxes are live.
      stream: message.stream ?? "platform",
      from: sender ?? "(no sender configured)",
      ...(inspectable ? { to: message.to, body: message.body } : {}),
    });
    return { delivered: false, reason: "dry-run" };
  }

  if (!apiKey || !sender) {
    log.warn(traceId, "email not sent — BREVO_API_KEY or a sender address is missing", {
      subject: message.subject,
      stream: message.stream ?? "platform",
    });
    return { delivered: false, reason: "not-configured" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: sender, name: process.env.BREVO_SENDER_NAME || "iqcommune" },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.body,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      log.error(traceId, "email rejected by provider", {
        status: response.status,
        subject: message.subject,
      });
      return { delivered: false, reason: "failed" };
    }

    const result = (await response.json()) as { messageId?: string };
    // A 201 means accepted for delivery, not delivered. Anything downstream
    // that treats this as proof the person read it will be wrong.
    log.info(traceId, "email accepted by provider", { subject: message.subject });
    return { delivered: true, messageId: result.messageId ?? null };
  } catch (cause) {
    log.error(traceId, "email send failed", { cause: String(cause) });
    return { delivered: false, reason: "failed" };
  }
}
