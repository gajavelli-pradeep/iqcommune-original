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

function emit(level: Level, traceId: string, message: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    traceId,
    message,
    time: new Date().toISOString(),
    ...context,
  });
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
