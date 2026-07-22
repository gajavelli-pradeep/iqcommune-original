import { describe, expect, it } from "vitest";

import { clientIdentifier } from "@/lib/rate-limit";

/**
 * The limiter's key must not be forgeable (audit H3). The left-most
 * X-Forwarded-For hop is caller-controlled, so keying on it lets anyone mint a
 * fresh bucket per request. These tests pin the trusted order:
 * x-real-ip first, else the RIGHT-most XFF hop, else "unknown".
 */
function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

describe("clientIdentifier", () => {
  it("prefers the platform-set x-real-ip", () => {
    expect(
      clientIdentifier(requestWith({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("203.0.113.9");
  });

  it("uses the RIGHT-most XFF hop, never the caller-controlled left-most", () => {
    // client-forged, proxy1, trusted-edge — the trusted value is the last hop.
    expect(clientIdentifier(requestWith({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("trims whitespace around the chosen hop", () => {
    expect(clientIdentifier(requestWith({ "x-forwarded-for": "1.1.1.1 ,  203.0.113.5 " }))).toBe(
      "203.0.113.5",
    );
  });

  it("falls back to 'unknown' when neither header is present", () => {
    expect(clientIdentifier(requestWith({}))).toBe("unknown");
  });

  it("does not treat a forged left-most XFF as identity", () => {
    const forged = clientIdentifier(requestWith({ "x-forwarded-for": "attacker, 203.0.113.1" }));
    expect(forged).not.toBe("attacker");
    expect(forged).toBe("203.0.113.1");
  });
});
