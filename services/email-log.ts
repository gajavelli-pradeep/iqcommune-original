import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import type { EmailResult } from "@/lib/email/outcome";

/**
 * Persistence for the email attempt log.
 *
 * Kept out of `lib/email/send.ts` so the sender stays a pure function of its
 * inputs and the provider — it is the piece worth unit-testing, and a Supabase
 * import would drag `server-only` and a live client into every one of those
 * tests.
 *
 * Nothing here throws. A send that worked must not be reported as failed
 * because the audit row could not be written, and a send that failed must not
 * lose its own error to a second one. Both cases fall back to the process log.
 */

/** How far back a same-template-same-recipient send counts as a duplicate. */
export const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

export interface EmailAttempt {
  traceId: string;
  template: string;
  recipient: string;
  stream: string;
  result: EmailResult;
}

export async function recordEmailAttempt(attempt: EmailAttempt): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("email_log").insert({
      trace_id: attempt.traceId,
      template: attempt.template,
      recipient: attempt.recipient,
      stream: attempt.stream,
      status: attempt.result.status,
      ok: attempt.result.ok,
      error_code: attempt.result.errorCode,
      error_message: attempt.result.errorMessage,
      retry_count: attempt.result.retryCount,
      provider_message_id: attempt.result.providerMessageId,
    });
    if (error) throw new Error(error.message);
  } catch (cause) {
    // Loud, because a silent gap in an audit log is worse than a noisy one:
    // the next person reads "no row" as "never attempted".
    log.error(attempt.traceId, "email attempt could not be logged", {
      template: attempt.template,
      status: attempt.result.status,
      cause: String(cause),
    });
  }
}

/**
 * Was this exact message already sent, recently?
 *
 * Guards the double-submit and the retried server action — a resend button
 * clicked twice, or a form posted twice on a flaky connection, should not put
 * two identical emails in someone's inbox. Scoped to successful attempts on
 * purpose: a previous *failure* is exactly the case where a second attempt is
 * wanted.
 *
 * Returns false when the check itself fails. Sending twice is a smaller harm
 * than a database blip silently swallowing every email the system owes.
 */
export async function alreadySent(
  traceId: string,
  template: string,
  recipient: string,
  windowMs = DUPLICATE_WINDOW_MS,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - windowMs).toISOString();
    const { data, error } = await supabase
      .from("email_log")
      .select("id")
      .eq("template", template)
      .eq("recipient", recipient)
      .eq("ok", true)
      .gte("created_at", since)
      .limit(1);
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  } catch (cause) {
    log.warn(traceId, "duplicate-send check failed — sending anyway", {
      template,
      cause: String(cause),
    });
    return false;
  }
}
