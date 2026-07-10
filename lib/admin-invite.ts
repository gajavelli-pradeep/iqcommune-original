import crypto from "crypto";
import { getBaseUrl } from "@/lib/base-url";

// Admin invite ("summon") tokens. The raw token travels only in the shared
// /join-admin URL; the DB stores its SHA-256 hash, so a DB leak yields nothing
// usable. Single-use + expiring state is tracked on the admin_invites row.

export const INVITE_TTL_DAYS = 7;

/** 32 random bytes as hex — the bearer token placed in the invite link. */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** SHA-256 of the raw token — what we persist and look up by. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Build the shareable invite URL the SA copies and sends manually. */
export function buildInviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl ?? getBaseUrl();
  return `${base}/join-admin?t=${token}`;
}

/** True when a Pending invite has passed its expiry instant. */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}
