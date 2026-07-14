import { sendEmail } from "./brevo";
import { guardEmailSend, revokeEmailSend } from "./idempotency";
import { log } from "@/lib/logger";

/**
 * Recipient for internal admin notifications (new application / new session
 * request). ADMIN_NOTIFY_EMAIL is preferred; falls back to the verified Brevo
 * sender so a deploy that forgot the var still reaches a real inbox. Returns
 * null only when neither is set (dev) — the caller then skips silently.
 */
export function adminNotifyRecipient(): string | null {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    process.env.BREVO_SENDER_EMAIL?.trim() ||
    null
  );
}

/**
 * Best-effort, idempotent admin notification. Mirrors the recipient-facing send
 * pattern (guard → send → revoke-on-failure) so a transient Brevo failure
 * retries on the next event instead of being permanently suppressed. Never
 * throws — an admin alert must not fail the user's submission.
 */
export async function notifyAdmin(opts: {
  emailType: string;
  entityId: string;
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const to = adminNotifyRecipient();
  if (!to) return;

  const alreadySent = await guardEmailSend(opts.emailType, opts.entityId, to);
  if (alreadySent) return;

  try {
    await sendEmail({ to, subject: opts.subject, htmlContent: opts.htmlContent });
  } catch (err) {
    log.error(`Admin notification (${opts.emailType}) failed — revoking sentinel so it can retry`, {
      error: String(err),
      entityId: opts.entityId,
    });
    await revokeEmailSend(opts.emailType, opts.entityId);
  }
}
