import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "@/lib/logger";

// Sliding-window limiter backed by Upstash Redis.
// Works correctly across all Vercel serverless instances (unlike an in-process Map).
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const limiter = new Ratelimit({
  redis,
  limiter:   Ratelimit.slidingWindow(10, "60 s"),
  analytics: false,
});

/**
 * Deliberately FAILS OPEN: if Upstash is unreachable, every caller is allowed through
 * rather than locking legitimate users out of the public forms during an outage we
 * can't control. That is a real tradeoff — while Upstash is down, the six public write
 * endpoints accept unlimited traffic — so the bypass must never be silent.
 *
 * `rateLimiterBypassed: true` is the field to alert on: it fires only on this path, so
 * a spike means the limiter is off, not that traffic is heavy. If abuse during an
 * outage ever outweighs the lockout risk, flip this to fail-closed here — every caller
 * already handles `limited: true`.
 */
export async function checkRateLimit(
  ip: string
): Promise<{ limited: boolean; reset: number }> {
  try {
    const { success, reset } = await limiter.limit(ip);
    return { limited: !success, reset };
  } catch (err) {
    log.error("Upstash unavailable — rate limiting is OFF, allowing the request", {
      error: String(err),
      ip,
      rateLimiterBypassed: true,
    });
    return { limited: false, reset: Date.now() + 60_000 };
  }
}
