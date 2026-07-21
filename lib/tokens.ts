import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokenised links — ADR 0004.
 *
 * Every emailed page takes one parameter, `t`, and nothing else. The payload
 * names the kind of link, the uuid of the row it acts on, and an expiry:
 *
 *   base64url({"k":"rate","id":"<uuid>","exp":1780000000}).base64url(hmac)
 *
 * `k` stops a token minted for one flow being replayed against another. `id` is
 * a uuid rather than a human-readable reference because sequential references
 * invite enumeration. Verification is constant-time, then kind, then expiry.
 *
 * Server-only: this reads HMAC_SECRET and must never reach the browser.
 */

export const TOKEN_KINDS = ["rate", "consent", "photos", "onboarding", "invite"] as const;
export type TokenKind = (typeof TOKEN_KINDS)[number];

export interface TokenPayload {
  k: TokenKind;
  id: string;
  exp: number;
}

export type TokenFailure = "malformed" | "bad-signature" | "wrong-kind" | "expired";

export type TokenResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: TokenFailure };

const encode = (value: Buffer | string) => Buffer.from(value).toString("base64url");

function sign(payload: string): Buffer {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    throw new Error("Missing HMAC_SECRET — tokenised links cannot be minted or verified without it.");
  }
  return createHmac("sha256", secret).update(payload).digest();
}

export function mintToken(kind: TokenKind, id: string, ttlSeconds: number): string {
  const payload: TokenPayload = {
    k: kind,
    id,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${encode(sign(encoded))}`;
}

export function verifyToken(kind: TokenKind, token: string | undefined): TokenResult {
  if (!token) return { ok: false, reason: "malformed" };

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return { ok: false, reason: "malformed" };

  const expected = sign(encoded);
  const given = Buffer.from(signature, "base64url");
  // Length is checked first: timingSafeEqual throws on a mismatch, and that
  // throw would itself leak the length through timing.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "bad-signature" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (payload.k !== kind) return { ok: false, reason: "wrong-kind" };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };

  return { ok: true, payload };
}
