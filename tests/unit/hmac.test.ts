import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.HMAC_SECRET = "test-secret-32-chars-minimum-xxxx";
  process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
});

describe("HMAC URL signing", () => {
  it("sign → verify round-trip succeeds", async () => {
    const { signOnboardingUrl, verifyOnboardingParams } = await import(
      "@/lib/hmac"
    );
    const params = {
      name: "Vikram Kulkarni",
      role: "Analyst",
      org: "Motilal",
      module: "Equity Investing Simplified",
      city: "Mumbai",
      state: "MH",
      ref: "0042",
      email: "v@gmail.com",
    };
    const url = signOnboardingUrl(params);
    const sp = new URL(url).searchParams;
    const result = verifyOnboardingParams(sp);
    expect(result).toMatchObject(params);
  });

  it("tampered URL returns null", async () => {
    const { signOnboardingUrl, verifyOnboardingParams } = await import(
      "@/lib/hmac"
    );
    const url = signOnboardingUrl({
      name: "Test",
      role: "R",
      org: "O",
      module: "M",
      city: "C",
      state: "",
      ref: "0001",
      email: "t@t.com",
    });
    const sp = new URL(url).searchParams;
    sp.set("name", "Hacker");
    expect(verifyOnboardingParams(sp)).toBeNull();
  });

  it("missing sig param returns null", async () => {
    const { verifyOnboardingParams } = await import("@/lib/hmac");
    const sp = new URLSearchParams("name=Test");
    expect(verifyOnboardingParams(sp)).toBeNull();
  });
});
