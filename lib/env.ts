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
};

export type Env = z.infer<typeof required>;

/**
 * Feature variables — declared here so the set is discoverable in one place,
 * and so `.env.example` can be diffed against it.
 */
export const FEATURE_ENV = {
  /** Canonical host for links inside outbound email. Required once email ships. */
  NEXT_PUBLIC_BASE_URL: "email links",
  /** Signs the tokenised /rate, /consent and /submit-photos links. */
  HMAC_SECRET: "tokenised public links",
  /** Brevo transactional email. */
  BREVO_API_KEY: "outbound email",
  BREVO_SENDER_EMAIL: "outbound email",
  /** Upstash, for rate limiting public mutations. */
  UPSTASH_REDIS_REST_URL: "rate limiting",
  UPSTASH_REDIS_REST_TOKEN: "rate limiting",
  /** Private bucket holding session photos. */
  SUPABASE_PHOTOS_BUCKET: "photo submissions",
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
      `Environment is not valid. Set these in .env.local (see .env.example):\n${problems}`,
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
