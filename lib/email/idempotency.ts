import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

/**
 * Returns true if this email was already sent (duplicate — skip it).
 * Returns false and inserts a sentinel if this is the first send attempt.
 *
 * IMPORTANT: callers MUST call revokeEmailSend() in their catch block if
 * sendEmail() throws — otherwise the sentinel is stuck and the email can
 * never be retried.
 */
export async function guardEmailSend(
  emailType: string,
  entityId: string,
  recipientEmail: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const idempotencyKey = createHash("sha256")
    .update(`${emailType}:${entityId}`)
    .digest("hex");

  const { error } = await supabase.from("sent_emails").insert({
    idempotency_key: idempotencyKey,
    email_type:      emailType,
    recipient_email: recipientEmail,
    entity_id:       entityId,
  });

  // 23505 = unique_violation — already sent, skip
  if (error?.code === "23505") return true;

  // Any other DB error — log but allow send (fail-open is safer than
  // silently suppressing the email on a transient DB error)
  if (error) {
    log.error("guardEmailSend: unexpected DB error — allowing send", {
      code:      error.code,
      error:     error.message,
      emailType,
      entityId,
    });
  }

  return false;
}

/**
 * Record Brevo's messageId on the sentinel so the delivery webhook can map a later
 * delivered/bounced event back to this entity.
 *
 * Skipping this doesn't fail the send — it quietly forfeits ever learning the truth
 * about it. The webhook matches on `brevo_message_id`, so a row without one keeps its
 * default 'sent' status forever, no matter what Brevo does with the message.
 * Best-effort by design: the email is already away, so a failure here is logged, not
 * thrown back at a caller who can't act on it.
 */
export async function recordEmailMessageId(
  emailType: string,
  entityId: string,
  messageId: string | null
): Promise<void> {
  if (!messageId) return;

  const { error } = await createAdminClient()
    .from("sent_emails")
    .update({ brevo_message_id: messageId })
    .eq("entity_id", entityId)
    .eq("email_type", emailType);

  if (error) {
    log.error("Failed to record Brevo messageId — delivery events can't be mapped back", {
      code: error.code,
      error: error.message,
      emailType,
      entityId,
    });
  }
}

/**
 * Remove the idempotency sentinel if the email send failed, so the next
 * call to guardEmailSend() allows a retry.
 * Call in the catch block after a failed sendEmail().
 */
export async function revokeEmailSend(
  emailType: string,
  entityId: string
): Promise<void> {
  const supabase = createAdminClient();
  const idempotencyKey = createHash("sha256")
    .update(`${emailType}:${entityId}`)
    .digest("hex");

  const { error } = await supabase
    .from("sent_emails")
    .delete()
    .eq("idempotency_key", idempotencyKey);

  if (error) {
    log.error("revokeEmailSend: failed to remove sentinel — retries blocked", {
      code: error.code,
      error: error.message,
      emailType,
      entityId,
    });
  }
}
