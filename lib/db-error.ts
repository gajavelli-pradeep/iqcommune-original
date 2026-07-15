import { log } from "@/lib/logger";

// Postgres error codes we can turn into something a user can act on. Anything
// else is genuinely unexpected and gets the caller's fallback + a 500.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";
const CHECK_VIOLATION = "23514";

const STATUS_BY_CODE: Record<string, number> = {
  [UNIQUE_VIOLATION]: 409,
  [FK_VIOLATION]: 409,
  [NOT_NULL_VIOLATION]: 400,
  [CHECK_VIOLATION]: 400,
};

// The shape Supabase/PostgREST returns on a failed query.
export interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Log a failed Supabase query with the detail needed to debug it, and resolve the
 * safe user-facing copy + HTTP status to return.
 *
 * Exists because a generic "Failed to create invite" 500 once hid an
 * `admin_invites_role_check` CHECK violation the route already had in hand — the
 * cause was on the server the whole time and cost hours to rediscover. The code and
 * constraint now always reach the logs, whatever the caller returns.
 *
 * Raw DB text (message/details/hint/constraint names) is logged and NEVER returned:
 * it leaks schema to the client. Callers map the codes they can explain via
 * `byCode`; everything else degrades to `fallback` + 500.
 */
export function resolveDbError(args: {
  /** What was being attempted, for the log line — e.g. "Create admin invite". */
  op: string;
  error: DbErrorLike | null | undefined;
  /** Shown when the code isn't one the caller explains. Must be user-safe. */
  fallback: string;
  /** Per-code user-safe copy, e.g. { "23514": "That role can't be invited." } */
  byCode?: Record<string, string>;
  /** Extra log context (ids, emails are PII — pass ids, not addresses). */
  ctx?: Record<string, unknown>;
}): { message: string; status: number } {
  const { op, error, fallback, byCode, ctx } = args;

  log.error(`${op} failed`, {
    code: error?.code,
    error: error?.message,
    details: error?.details,
    hint: error?.hint,
    ...ctx,
  });

  const code = error?.code;
  if (code && byCode?.[code]) {
    return { message: byCode[code], status: STATUS_BY_CODE[code] ?? 400 };
  }
  return { message: fallback, status: 500 };
}

export const PG_CODE = {
  UNIQUE_VIOLATION,
  FK_VIOLATION,
  NOT_NULL_VIOLATION,
  CHECK_VIOLATION,
} as const;
