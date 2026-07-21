import { mintToken, type TokenKind } from "@/lib/tokens";

/**
 * The only place a tokenised link is built.
 *
 * ADR 0004's third follow-through item: no template concatenates a raw id. A
 * link is minted here or it does not exist, which is what keeps the id out of
 * the URL and the URL out of a template author's hands.
 */

const PATHS: Record<TokenKind, string> = {
  rate: "/rate",
  consent: "/consent",
  photos: "/submit-photos",
  onboarding: "/onboarding",
  invite: "/join-admin",
};

/** Days, not months — a token cannot be revoked before it expires. */
const TTL_DAYS: Record<TokenKind, number> = {
  rate: 14,
  consent: 7,
  photos: 30,
  onboarding: 14,
  invite: 7,
};

export function buildLink(kind: TokenKind, id: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_BASE_URL — an emailed link needs an absolute host.");
  }
  const token = mintToken(kind, id, TTL_DAYS[kind] * 24 * 60 * 60);
  return `${base.replace(/\/$/, "")}${PATHS[kind]}?t=${token}`;
}
