import type { NextConfig } from "next";

/**
 * Security headers (audit C1). Set here rather than in `proxy.ts` so the two
 * marketing pages (`/`, `/practitioners`) stay statically rendered — a
 * nonce-based CSP would force every route dynamic (Next CSP guide, "Static vs
 * Dynamic Rendering"). This app ships no third-party scripts, no
 * `dangerouslySetInnerHTML` and no injection sinks, so `'unsafe-inline'` on
 * script-src is a low residual risk; the load-bearing control is
 * `frame-ancestors 'none'` + `X-Frame-Options: DENY`, which kills the
 * clickjacking of the legally-binding /onboarding, /consent and /rate pages.
 *
 * Upgrading to a strict nonce/SRI CSP (drops `'unsafe-inline'`) is tracked as a
 * hardening follow-up in flaws.md.
 */
const isDev = process.env.NODE_ENV === "development";

// Supabase origin is needed for the browser client (connect-src) and any
// storage image served directly rather than through /_next/image (img-src).
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
})();

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  `font-src 'self'`,
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Published gallery photos are served from Supabase Storage's public URL; the
// image optimizer 400s on an absolute external src unless its host is allowed.
// This must NOT silently degrade to an empty remotePatterns when the env is
// absent at build time (audit C7) — that ships a build whose first published
// photo breaks the homepage. NEXT_PUBLIC_SUPABASE_URL is a REQUIRED var, so a
// build without it is a misconfiguration: fail loudly here rather than later.
const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be set at build time — the app and the image " +
        "remotePatterns depend on it (audit C7). Set it in the build environment.",
    );
  }
  return new URL(url).hostname;
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev-only (Next's own logging.md): without this, every Server Action
  // prints its full arguments to the terminal — practitioner emails, the
  // signed onboarding link's token, a status update's whole request body.
  // None of that is this app's own logging (see `lib/logger.ts`, which never
  // takes raw PII); it's Next's built-in call trace, and this is the one
  // documented switch for it.
  logging: {
    serverFunctions: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
