import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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
    console.error("[guardEmailSend] unexpected error — allowing send", {
      code:      error.code,
      message:   error.message,
      emailType,
      entityId,
    });
  }

  return false;
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
    console.error("[revokeEmailSend] failed to remove sentinel — retries blocked", {
      code: error.code,
      message: error.message,
      emailType,
    });
  }
}
