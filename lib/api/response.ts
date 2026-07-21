import { NextResponse } from "next/server";

/**
 * One response envelope for every route — F2.
 *
 * The previous system forked its success shape five ways because this was never
 * decided once, and each consumer then guessed. There is exactly one shape here
 * and no route may invent another.
 */

export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiFailure {
  data: null;
  error: {
    code: ErrorCode;
    /** Safe to show a user: no stack, no query, no identifiers. */
    message: string;
    /** Ties this response to its server log line. */
    traceId: string;
    /** Field-level detail, only ever for VALIDATION_FAILED. */
    fields?: Record<string, string>;
  };
}

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(
  code: ErrorCode,
  message: string,
  traceId: string,
  fields?: Record<string, string>,
): NextResponse<ApiFailure> {
  return NextResponse.json(
    { data: null, error: { code, message, traceId, ...(fields ? { fields } : {}) } },
    { status: ERROR_CODES[code] },
  );
}
