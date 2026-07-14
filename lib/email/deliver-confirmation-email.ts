import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/brevo";
import { sessionConfirmationEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";
import { log } from "@/lib/logger";

// One email type keyed per confirmation id — matches the reference used by the
// delivery webhook to map a Brevo event back to a confirmation row.
const EMAIL_TYPE = "session_confirmation";

// Send-time outcomes. The webhook later refines a 'sent' row to 'delivered'/'bounced'.
export type ConfirmationEmailOutcome = "sent" | "failed" | "no_email";

export interface ConfirmationEmailFields {
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

/**
 * Send (or resend) the consent email for a confirmation and report the outcome, so
 * callers can persist an `email_status` the console surfaces. Idempotent for the
 * first send (the `sent_emails` sentinel dedupes double-submits); pass `force` to
 * resend after a failure/bounce. Records Brevo's `messageId` on the sentinel so the
 * delivery webhook can map events back to this confirmation.
 *
 * Never throws — a failed send returns "failed" (the confirmation itself already
 * exists and must not be rolled back over an email hiccup).
 */
export async function deliverConfirmationEmail(args: {
  confirmationId: string;
  practitionerName: string;
  practitionerEmail: string | null;
  fields: ConfirmationEmailFields;
  force?: boolean;
}): Promise<ConfirmationEmailOutcome> {
  const { confirmationId, practitionerName, practitionerEmail, fields, force } = args;
  if (!practitionerEmail) return "no_email";

  const supabase = createAdminClient();

  // Resend forces a fresh attempt — clear any prior sentinel so guardEmailSend re-inserts.
  if (force) await revokeEmailSend(EMAIL_TYPE, confirmationId);

  const alreadySent = await guardEmailSend(EMAIL_TYPE, confirmationId, practitionerEmail);
  if (alreadySent) return "sent"; // a prior successful send holds the sentinel

  try {
    const { subject, htmlContent } = sessionConfirmationEmail(practitionerName, fields);
    const { messageId } = await sendEmail({ to: practitionerEmail, name: practitionerName, subject, htmlContent });
    if (messageId) {
      await supabase
        .from("sent_emails")
        .update({ brevo_message_id: messageId, status: "sent" })
        .eq("entity_id", confirmationId)
        .eq("email_type", EMAIL_TYPE);
    }
    return "sent";
  } catch (err) {
    log.error("Confirmation email send failed", { error: String(err), confirmationId, refCode: fields.refCode });
    await revokeEmailSend(EMAIL_TYPE, confirmationId); // free the sentinel so a resend can retry
    return "failed";
  }
}
