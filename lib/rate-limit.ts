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

/**
 * Client identity for limiting (audit H3).
 *
 * `x-real-ip` is set by the platform proxy (Vercel) to the true client IP and
 * cannot be forged by the caller — prefer it. A caller-supplied
 * `x-forwarded-for` is only trustworthy at its RIGHT-most hop, the one appended
 * by the last trusted proxy; the LEFT-most entry is attacker-controlled, so
 * keying the limiter on it lets anyone mint a fresh bucket per request and
 * defeat the limit entirely. Never trust the left-most XFF value.
 */
export function clientIdentifier(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
}
