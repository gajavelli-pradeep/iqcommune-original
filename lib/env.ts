import "server-only";

import { z } from "zod";

/**
 * Environment contract — fail fast, at boot, with the variable named.
 *
 * The previous system validated nothing centrally: a missing key surfaced as a
 * 500 from whichever route happened to touch it first. Here the process
 * refuses to start, and says which variable is wrong.
 *
 * Two tiers, deliberately:
 *
 *   REQUIRED  — the app cannot serve a request without it. Checked at boot.
 *   FEATURE   — needed only by a capability that is not built yet. Read through
 *               `requireEnv()`, which throws a named error at the call site
 *               rather than letting `undefined` reach an API client.
 *
 * A FEATURE variable is promoted to REQUIRED in the same change that ships the
 * feature needing it — never later.
 */

const required = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("must be the project URL, e.g. https://xxx.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "looks too short to be the anon key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "looks too short to be the service-role key"),
  // Promoted FEATURE → REQUIRED (audit H1): each feature needing these has
  // shipped, so ADR-0004's rule ("promote in the same change that ships the
  // feature") applies. Without them a deploy boots green then 500s per request —
  // boot-validation turns that into a loud failed deploy instead.
  //   HMAC_SECRET      — signs all five tokenised link pages
  //   UPSTASH_*        — rate-limits all seven public mutations
  //   NEXT_PUBLIC_BASE_URL — canonical host for emailed links + OG/canonical URLs
  HMAC_SECRET: z.string().min(32, "must be at least 32 chars — it signs the tokenised links"),
  UPSTASH_REDIS_REST_URL: z.string().url("must be the Upstash REST URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(20, "looks too short to be the Upstash token"),
  NEXT_PUBLIC_BASE_URL: z.string().url("must be an absolute URL, e.g. https://iqcommune.com"),
});

/**
 * Referenced as static property accesses so Next can inline the
 * `NEXT_PUBLIC_*` values into the client bundle. Destructuring `process.env`
 * would break that silently.
 */
const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  HMAC_SECRET: process.env.HMAC_SECRET,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
};

export type Env = z.infer<typeof required>;

/**
 * Feature variables — declared here so the set is discoverable in one place,
 * and so `.env.example` can be diffed against it.
 */
export const FEATURE_ENV = {
  /** Brevo transactional email. */
  BREVO_API_KEY: "outbound email",
  BREVO_SENDER_EMAIL: "outbound email",
  /**
   * Per-stream From addresses (client decision, 2026-07-23): practitioner
   * pipeline mail from practitioner@iqcommune.com, session mail from
   * session@iqcommune.com. Both OPTIONAL on purpose — each falls back to
   * BREVO_SENDER_EMAIL until the Google Workspace mailbox exists AND has been
   * verified with Brevo, which will not accept a send from an unverified
   * address. Set each one when its mailbox is live; no deploy is needed.
   */
  BREVO_SENDER_PRACTITIONER: "practitioner-pipeline email sender",
  BREVO_SENDER_SESSION: "session email sender",
  /** Private bucket holding session photos. */
  SUPABASE_PHOTOS_BUCKET: "photo submissions",
  /** "live" enables real Brevo sends; anything else is a logged dry run. */
  EMAIL_DELIVERY: "outbound email delivery mode",
  /** Where new-session-request notifications go. */
  ADMIN_NOTIFY_EMAIL: "admin new-request notification",
  /**
   * The address the request form offers a visitor when their submission cannot
   * be saved — the mailto fallback's recipient.
   *
   * Its own variable rather than `BREVO_SENDER_SESSION`, which was doing two
   * jobs: that one is the `From:` Brevo sends session mail as, and it can only
   * hold a mailbox Brevo has verified. Pointing it at a plain inbox to change
   * where visitors write would silently break every outbound session email. The
   * two addresses are usually the same and are free not to be.
   */
  SESSION_CONTACT_EMAIL: "mailto fallback on the request form",
  /**
   * The inbox the site prints — the footer on every page, and the "questions?"
   * line under each emailed link page.
   *
   * Its own variable for the same reason as the one above: `BREVO_SENDER_EMAIL`
   * is a `From:` Brevo accepts only once it has verified that mailbox, so
   * repointing it to change what the website displays would break outbound
   * platform mail. This address is never sent from, only rendered.
   */
  CONTACT_EMAIL: "public inbox shown on the site",
  /** Display name on outbound Brevo email. */
  BREVO_SENDER_NAME: "outbound email",
} as const;

export type FeatureEnvKey = keyof typeof FEATURE_ENV;

let cached: Env | undefined;

/**
 * Throws with every problem at once — fixing env vars one boot at a time is
 * the slowest possible loop.
 */
export function validateEnv(): Env {
  if (cached) return cached;

  const parsed = required.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      // Points at docs/ENVIRONMENT.md, not .env.example (audit M12): the example
      // is deliberately not committed (see that doc), so a fresh clone has no
      // such file to "see".
      `Environment is not valid. Set these in .env.local (see docs/ENVIRONMENT.md):\n${problems}`,
    );
  }

  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as Env, {
  get: (_target, key: string) => validateEnv()[key as keyof Env],
});

/** A feature variable, or a clear error naming what needed it. */
export function requireEnv(key: FeatureEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key} — required for ${FEATURE_ENV[key]}. Add it to .env.local.`);
  }
  return value;
}

/**
 * The address the site has always printed, and the fallback when the variable
 * is unset. Legal copy holds this same string as a literal — see the guard in
 * `tests/unit/env-contract.test.ts` for why it is not templated there.
 */
export const CONTACT_EMAIL_DEFAULT = "hello@iqcommune.com";

/**
 * The public inbox, for rendering.
 *
 * A literal fallback rather than `requireEnv`: this string goes into the page
 * chrome, so an unset variable has to degrade to the right address — never to a
 * thrown request, and never to a footer reading `undefined`.
 */
export function contactEmail(): string {
  return process.env.CONTACT_EMAIL || CONTACT_EMAIL_DEFAULT;
}