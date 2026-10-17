import { describe, expect, it, vi } from "vitest";

describe("next.config redirects", () => {
  it("permanently sends /practitioners (and sub-paths) to /network", async () => {
    // next.config.ts throws at import without this (image remotePatterns).
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    const { default: config } = await import("../../next.config");

    expect(await config.redirects?.()).toEqual([
      { source: "/practitioners/:path*", destination: "/network/:path*", permanent: true },
    ]);
  });
});
