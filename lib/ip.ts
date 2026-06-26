import { NextRequest } from "next/server";

/**
 * Extract the verified client IP from the request.
 *
 * Priority:
 * 1. x-real-ip — Vercel's edge sets this to the verified client IP (not spoofable).
 * 2. Leftmost x-forwarded-for entry — the original client per RFC 7239.
 *
 * Never use the rightmost XFF entry: it is the IP of the most recent hop
 * (Vercel's own infrastructure) and is attacker-controllable on self-hosted setups.
 */
export function clientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim() || "unknown";
  }

  return "unknown";
}
