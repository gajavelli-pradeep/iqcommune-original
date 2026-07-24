/**
 * The site's own public base URL, for site-wide metadata only — canonical
 * links, OG tags, sitemap.xml, robots.txt. Never for anything security-
 * sensitive (see the note on tokenised links below).
 *
 * `NEXT_PUBLIC_BASE_URL`, when set, is authoritative — the real custom
 * domain, and still the recommended way to configure this. Unset only
 * happens when nobody has set it yet on some Vercel deployment (production
 * or a preview branch); `VERCEL_URL` is always present there, so falling
 * back to it means metadata still resolves to a real, reachable URL instead
 * of "http://localhost:3000" silently leaking into production — which is
 * exactly what the three call sites of this function used to do before it
 * existed, each with its own copy of the same wrong fallback.
 *
 * `lib/email/links.ts` (tokenised rate/consent/photos/onboarding/invite
 * links) deliberately does NOT use this — a wrong guess there sends a real
 * email with a broken link, so that path stays strict and throws instead of
 * guessing. Getting a canonical URL slightly wrong is cosmetic; getting an
 * emailed link wrong is not.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
