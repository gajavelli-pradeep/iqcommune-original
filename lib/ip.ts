import { NextRequest } from "next/server";

/**
 * Extract the client IP from a request.
 * Takes the rightmost entry in x-forwarded-for because Vercel/most reverse proxies
 * append the real client IP at the end, making it the only trustworthy hop.
 */
export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    return ips[ips.length - 1] ?? "unknown";
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
