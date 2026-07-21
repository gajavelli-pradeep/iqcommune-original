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

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. HTML templates arrive with the admin console's drafts (P8). */
  body: string;
}

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;

export type SendOutcome =
  | { delivered: true; messageId: string | null }
  | { delivered: false; reason: "dry-run" | "not-configured" | "failed" };

export async function sendEmail(traceId: string, message: EmailMessage): Promise<SendOutcome> {
  const apiKey = process.env.BREVO_API_KEY;
  const sender = process.env.BREVO_SENDER_EMAIL;

  if (process.env.EMAIL_DELIVERY !== "live") {
    log.info(traceId, "email not sent — dry run", {
      to: message.to,
      subject: message.subject,
      body: message.body,
    });
    return { delivered: false, reason: "dry-run" };
  }

  if (!apiKey || !sender) {
    log.warn(traceId, "email not sent — BREVO_API_KEY or BREVO_SENDER_EMAIL missing", {
      subject: message.subject,
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
