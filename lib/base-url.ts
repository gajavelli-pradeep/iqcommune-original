import type { NextRequest } from "next/server";

/**
 * Public base URL for building user-facing links (emails, consent, onboarding,
 * status, invites, photo submissions) and site metadata. One source of truth so
 * no link ever hardcodes a host. Resolution order:
 *   1. NEXT_PUBLIC_BASE_URL — the canonical, trusted site URL. Preferred so
 *      emailed links can't be redirected via a spoofed Host header, and REQUIRED
 *      for self-hosted deploys (nothing else auto-detects the public domain).
 *   2. The incoming request's origin — honoring X-Forwarded-Host/-Proto first so
 *      it yields the PUBLIC https domain when behind a reverse proxy (nginx /
 *      Caddy / Traefik), not the internal http://localhost the app binds to.
 *   3. VERCEL_PROJECT_PRODUCTION_URL — request-less prod contexts on Vercel.
 *   4. http://localhost:3000 — final dev fallback.
 * Trailing slashes are stripped so callers can safely append "/path".
 */
export function getBaseUrl(req?: NextRequest | Request): string {
  const onVercel = Boolean(process.env.VERCEL);
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");

  // Trust the configured canonical URL — EXCEPT a localhost value while running
  // on Vercel, which is always a misconfiguration (emailed links would point at
  // a dev machine). In that case fall through to the real deployment host.
  const envIsLocalhost = !!env && /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(env);
  if (env && !(onVercel && envIsLocalhost)) return env;

  const fromRequest = req && originFromRequest(req);
  if (fromRequest) return fromRequest;

  // Vercel injects the stable production domain — use it before the dev default
  // so request-less contexts (layout, sitemap, OG) never emit localhost in prod.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/+$/, "");
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}

/**
 * Resolve the public origin from a request, preferring proxy-forwarded headers.
 * Self-hosted Next.js binds to an internal http host, so the raw request URL is
 * wrong behind a reverse proxy — X-Forwarded-Host/-Proto carry the real public
 * values. Both can be comma-separated when proxies chain; the client-facing hop
 * is the first entry. Only consulted when NEXT_PUBLIC_BASE_URL is unset, so these
 * spoofable headers never override the trusted canonical URL.
 */
function originFromRequest(req: NextRequest | Request): string | null {
  try {
    const url = new URL(req.url);
    const first = (v: string | null) => v?.split(",")[0]?.trim() || undefined;
    const host = first(req.headers.get("x-forwarded-host")) ?? url.host;
    const proto = first(req.headers.get("x-forwarded-proto")) ?? url.protocol.replace(":", "");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}
