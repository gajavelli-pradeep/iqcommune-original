import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mintToken, verifyToken } from "@/lib/tokens";

/** ADR 0004's contract, including every way a link is meant to be rejected. */

const ID = "3f1c2b9e-8a4d-4b31-9c77-0f2a5d6e7b81";

beforeEach(() => {
  vi.stubEnv("HMAC_SECRET", "test-secret-at-least-32-characters-long");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("tokenised links", () => {
  it("round-trips a token it minted", () => {
    const result = verifyToken("rate", mintToken("rate", ID, 3600));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.id).toBe(ID);
  });

  it("rejects a token minted for a different flow", () => {
    // The whole point of `k`: a leaked rating link must not work on /consent.
    const result = verifyToken("consent", mintToken("rate", ID, 3600));
    expect(result).toEqual({ ok: false, reason: "wrong-kind" });
  });

  it("rejects a tampered payload", () => {
    const [, signature] = mintToken("rate", ID, 3600).split(".");
    const forged = Buffer.from(
      JSON.stringify({ k: "rate", id: ID, exp: 9999999999 }),
    ).toString("base64url");
    expect(verifyToken("rate", `${forged}.${signature}`)).toEqual({
      ok: false,
      reason: "bad-signature",
    });
  });

  it("rejects a token signed with a different secret", () => {
    const token = mintToken("rate", ID, 3600);
    vi.stubEnv("HMAC_SECRET", "a-completely-different-secret-value-here");
    expect(verifyToken("rate", token)).toEqual({ ok: false, reason: "bad-signature" });
  });

  it("rejects an expired token", () => {
    const token = mintToken("rate", ID, 60);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 61_000));
    expect(verifyToken("rate", token)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects missing and malformed tokens", () => {
    expect(verifyToken("rate", undefined)).toEqual({ ok: false, reason: "malformed" });
    expect(verifyToken("rate", "not-a-token")).toEqual({ ok: false, reason: "malformed" });
  });

  it("refuses to run without a secret rather than signing with an empty one", () => {
    vi.stubEnv("HMAC_SECRET", "");
    expect(() => mintToken("rate", ID, 60)).toThrow(/HMAC_SECRET/);
  });
});
