/**
 * Every way an email attempt can end, and what to say about each.
 *
 * The point of naming them is that "it failed" is not actionable. A missing
 * API key, a mistyped address, Brevo rate-limiting us and a dropped connection
 * are four different problems with four different owners, and the old sender
 * collapsed all of them into `reason: "failed"`. An admin who clicks Resend and
 * sees "failed" learns nothing; the same admin who sees "Authentication failed"
 * knows to check the key, and one who sees "Rate limit exceeded" knows to wait.
 *
 * `retryable` is the transient/permanent split, and it is the only thing the
 * retry loop consults. Re-sending to an address that does not parse will never
 * succeed, and re-sending on a 401 just burns the rate limit.
 */

export type EmailStatus =
  | "sent"
  | "queued"
  | "duplicate"
  | "dry-run"
  | "invalid-recipient"
  | "not-configured"
  | "auth-failed"
  | "rejected"
  | "rate-limited"
  | "server-error"
  | "network-unavailable"
  | "timeout"
  | "unknown";

export interface OutcomeShape {
  /**
   * Is this an outcome anyone needs to chase? A dry run is `ok` — the system
   * did exactly what it was configured to do — and it is emphatically NOT
   * delivered. Keeping these apart matters: the invite UI reported "Invite
   * sent" for every dry run because it keyed off `ok`, which is the one thing
   * a person reading that sentence needs it not to mean.
   */
  ok: boolean;
  /** Did this message actually go out to the recipient? Only this may say "sent". */
  delivered: boolean;
  /** Worth another attempt with the same input. */
  retryable: boolean;
  /** Shown to a person in the console. No stack traces, no provider jargon. */
  message: string;
}

const fail = (message: string, retryable = false): OutcomeShape => ({
  ok: false,
  delivered: false,
  retryable,
  message,
});

export const OUTCOMES: Record<EmailStatus, OutcomeShape> = {
  sent: { ok: true, delivered: true, retryable: false, message: "Email sent successfully." },
  queued: { ok: true, delivered: true, retryable: false, message: "Email queued successfully." },
  // Delivered, just not by this attempt — the earlier one is why we stopped.
  duplicate: { ok: true, delivered: true, retryable: false, message: "Email already sent." },
  // The only outcome that is fine AND did not go out. EMAIL_DELIVERY is unset.
  "dry-run": {
    ok: true,
    delivered: false,
    retryable: false,
    message: "Email not sent — delivery is switched off in this environment (EMAIL_DELIVERY).",
  },
  "invalid-recipient": fail("Invalid recipient email."),
  "not-configured": fail("Missing configuration."),
  "auth-failed": fail("Authentication failed."),
  rejected: fail("The provider rejected this message."),
  "rate-limited": fail("Rate limit exceeded.", true),
  "server-error": fail("Temporary server error.", true),
  "network-unavailable": fail("Network unavailable.", true),
  timeout: fail("The provider did not respond in time.", true),
  unknown: fail("Unknown error."),
};

export interface EmailResult extends OutcomeShape {
  status: EmailStatus;
  /** Provider status code, `TIMEOUT`, or the thrown error's name. */
  errorCode: string | null;
  /** The provider's own words, kept for the log and never shown to a visitor. */
  errorMessage: string | null;
  /** How many attempts followed the first one. */
  retryCount: number;
  providerMessageId: string | null;
}

export function result(
  status: EmailStatus,
  extra: Partial<Omit<EmailResult, "status" | keyof OutcomeShape>> = {},
): EmailResult {
  return {
    status,
    ...OUTCOMES[status],
    errorCode: extra.errorCode ?? null,
    errorMessage: extra.errorMessage ?? null,
    retryCount: extra.retryCount ?? 0,
    providerMessageId: extra.providerMessageId ?? null,
  };
}

/**
 * What an HTTP status from Brevo means for us.
 *
 * 429 and 5xx are the only ones worth retrying. A 400 is a malformed message
 * and a 401/403 is a credential problem; both fail identically forever, so
 * retrying them wastes the rate limit that a genuinely transient failure needs.
 */
export function classifyStatus(status: number): EmailStatus {
  if (status === 200 || status === 201) return "sent";
  if (status === 202) return "queued";
  if (status === 401 || status === 403) return "auth-failed";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  if (status >= 400) return "rejected";
  return "unknown";
}

/**
 * What a thrown error means.
 *
 * `AbortError` is our own timeout firing, not the provider's. Everything from
 * `fetch` that is not an abort is a connection that never completed — DNS,
 * TLS, a dropped socket — which is a network problem and worth one more try.
 */
export function classifyThrown(error: unknown): EmailStatus {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError") return "timeout";
  if (error instanceof TypeError) return "network-unavailable";
  return name ? "network-unavailable" : "unknown";
}

/**
 * Whether an address is worth sending to.
 *
 * Deliberately not an RFC 5322 parser — that accepts things no mail server
 * does, and this is a gate, not a validator. The controls that matter: exactly
 * one @, something either side, a dot in the domain, no whitespace, and no CR
 * or LF, which is what turns a recipient field into header injection.
 */
export function isSendableAddress(address: string): boolean {
  if (!address || address.length > 254) return false;
  if (/[\s<>,;]/.test(address)) return false;
  return /^[^@]+@[^@]+\.[^@.]{2,}$/.test(address);
}
