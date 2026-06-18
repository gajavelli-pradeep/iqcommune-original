// NOTE: This limiter is in-process. On serverless (Vercel) each function
// instance has its own store — limits are not enforced across instances.
// For production at scale, replace with @upstash/ratelimit (Redis-backed).
interface RLWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RLWindow>();
const MAX_STORE_SIZE = 10_000;
const PURGE_INTERVAL_MS = 60_000;
let lastPurge = 0;

function purgeExpired(now: number) {
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
  lastPurge = now;
}

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  const now = Date.now();

  // Time-based purge: runs at most once per minute instead of only when the
  // store is full, preventing unbounded accumulation under moderate traffic.
  if (now - lastPurge > PURGE_INTERVAL_MS || store.size >= MAX_STORE_SIZE) {
    purgeExpired(now);
  }

  const win = store.get(key);

  if (!win || win.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (win.count >= max) return false;
  win.count++;
  return true;
}
