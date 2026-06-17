interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): boolean {
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
