import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for public mutations — F2.
 *
 * Upstash is optional in development: with no credentials configured every
 * request is allowed, and that is stated in the log rather than silently
 * assumed. It is NOT optional in production, where an unlimited public write
 * endpoint is an invitation.
 */

const configured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const limiter = configured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "iqc:v7",
    })
  : undefined;

export interface RateLimitResult {
  allowed: boolean;
  /** False when no limiter is configured, so callers can log the gap. */
  enforced: boolean;
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and " +
          "UPSTASH_REDIS_REST_TOKEN — public mutations must not run unlimited in production.",
      );
    }
    return { allowed: true, enforced: false };
  }
  const { success } = await limiter.limit(identifier);
  return { allowed: success, enforced: true };
}

/** Best-effort client identity for limiting. Proxies vary; order matters. */
export function clientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
