import { afterEach, describe, expect, it, vi } from "vitest";

import { siteUrl } from "@/lib/siteUrl";

/**
 * Regression for the bug this file exists to fix: layout.tsx, sitemap.ts and
 * robots.ts each carried their own `?? "http://localhost:3000"` fallback, so
 * a Vercel deployment that never had NEXT_PUBLIC_BASE_URL configured served
 * localhost in its canonical URLs, OG tags, sitemap and robots.txt — quietly,
 * since nothing crashed. siteUrl() consolidates the three copies and prefers
 * Vercel's own deployment URL over localhost whenever it's actually running
 * on Vercel.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("siteUrl", () => {
  it("prefers the explicit, authoritative env var when set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://iqcommune.com");
    vi.stubEnv("VERCEL_URL", "some-preview-deploy.vercel.app");

    expect(siteUrl()).toBe("https://iqcommune.com");
  });

  it("falls back to Vercel's own deployment URL when nobody configured the explicit one", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    vi.stubEnv("VERCEL_URL", "iqcommune-abc123.vercel.app");

    expect(siteUrl()).toBe("https://iqcommune-abc123.vercel.app");
  });

  it("only falls back to localhost when neither is present — genuine local dev", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
