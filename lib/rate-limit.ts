interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
const MAX_STORE_SIZE = 10_000;

function purgeExpired() {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
  // Prevent unbounded growth on high-cardinality IP traffic
  if (store.size >= MAX_STORE_SIZE) purgeExpired();

  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (win.count >= max) return false;
  win.count++;
  return true;
}
