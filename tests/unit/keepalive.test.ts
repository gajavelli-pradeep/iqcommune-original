import { afterEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ limit }) }) }),
}));

const { GET } = await import("@/app/api/keepalive/route");

/**
 * The keepalive's job is to reach Postgres on a schedule. Two things can make it
 * useless without looking broken: an open endpoint anyone can call, and a
 * failure nobody notices. The gate is what these cover.
 */

const call = (headers: Record<string, string> = {}) =>
  GET(new Request("https://iqcommune.com/api/keepalive", { headers }));

afterEach(() => {
  vi.unstubAllEnvs();
  limit.mockReset();
});

describe("keepalive", () => {
  it("refuses to run when no secret is configured", async () => {
    // Fail closed. Accepting the call would leave an endpoint anyone can loop
    // on, and Vercel sends no Authorization header without this variable.
    vi.stubEnv("CRON_SECRET", "");

    expect((await call()).status).toBe(500);
    expect(limit).not.toHaveBeenCalled();
  });

  it("rejects a caller without the cron authorization", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-cron-secret");

    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer wrong" })).status).toBe(401);
    expect(limit).not.toHaveBeenCalled();
  });

  it("queries the database when Vercel calls it", async () => {
    // The whole point: a request that does not reach Postgres keeps the site
    // looking busy while Supabase counts no activity and pauses anyway.
    vi.stubEnv("CRON_SECRET", "a-long-enough-cron-secret");
    limit.mockResolvedValue({ data: [], error: null });

    const response = await call({ authorization: "Bearer a-long-enough-cron-secret" });

    expect(response.status).toBe(200);
    expect(limit).toHaveBeenCalledTimes(1);
    // An empty table is a pass — the query still reached the database.
    expect(await response.json()).toEqual({ data: { alive: true }, error: null });
  });

  it("reports a failed query rather than claiming it is alive", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-enough-cron-secret");
    limit.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    const response = await call({ authorization: "Bearer a-long-enough-cron-secret" });

    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("INTERNAL");
  });
});
