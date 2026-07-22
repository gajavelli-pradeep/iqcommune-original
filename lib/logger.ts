/**
 * Structured logging with a per-request trace id — F2.
 *
 * The id is returned to the user in the error envelope and printed in the log,
 * so a support message quoting it leads straight to the failing request. That
 * is the whole point: a user-facing message stays vague, the log stays precise.
 */

export function newTraceId(): string {
  return crypto.randomUUID();
}

type Level = "info" | "warn" | "error";

// Last-line PII guard (audit M27). Domain failures wrap the raw provider
// message, which for a unique-violation carries the offending email; a caller
// might also pass one in `context`. Redacting email addresses from every
// serialized line here means no single log call has to remember to — the guard
// is global, not per-route.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

function emit(level: Level, traceId: string, message: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    traceId,
    message,
    time: new Date().toISOString(),
    ...context,
  }).replace(EMAIL, "[email]");
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/**
 * Never pass raw user input, email addresses, phone numbers or names into
 * `context` — log shapes and counts, not people.
 */
export const log = {
  info: (traceId: string, message: string, context?: Record<string, unknown>) =>
    emit("info", traceId, message, context),
  warn: (traceId: string, message: string, context?: Record<string, unknown>) =>
    emit("warn", traceId, message, context),
  error: (traceId: string, message: string, context?: Record<string, unknown>) =>
    emit("error", traceId, message, context),
};
