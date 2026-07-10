import type { NextRequest } from "next/server";

/**
 * Public base URL for building user-facing links (emails, consent, onboarding,
 * status, invites, photo submissions) and site metadata. One source of truth so
 * no link ever hardcodes a host. Resolution order:
 *   1. NEXT_PUBLIC_BASE_URL — the canonical, trusted site URL. Preferred so
 *      emailed links can't be redirected via a spoofed Host header.
 *   2. The incoming request's origin — used only when the env var is unset, so a
 *      deploy that forgot to configure it still yields the real host instead of
 *      a hardcoded localhost.
 *   3. http://localhost:3000 — final dev fallback.
 * Trailing slashes are stripped so callers can safely append "/path".
 */
export function getBaseUrl(req?: NextRequest | Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  if (req) {
    try {
      return new URL(req.url).origin;
    } catch {
      /* fall through to the dev default */
    }
  }
  return "http://localhost:3000";
}
