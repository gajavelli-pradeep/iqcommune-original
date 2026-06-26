import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

export async function checkRateLimit(
  ip: string
): Promise<{ limited: boolean; reset: number }> {
  try {
    const { success, reset } = await limiter.limit(ip);
    return { limited: !success, reset };
  } catch (err) {
    // Fail-open: Redis unavailable shouldn't block all requests.
    console.error("[rate-limit] Upstash unavailable — failing open", err);
    return { limited: false, reset: Date.now() + 60_000 };
  }
}
