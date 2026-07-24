// @vitest-environment node
//
// Middleware belongs to the edge/Node runtime, not a browser DOM — under the
// project's default jsdom environment, `NextResponse.next()` rejects the
// request because jsdom's polyfilled `Headers` isn't the same class Next's
// own internals check against. Node's native `Headers` is.
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The refresh call is best-effort by design (see the comment in proxy.ts) —
 * this pins that a Supabase outage can't turn "best-effort" into "the
 * middleware itself crashes for every console request". Verified live first:
 * a real network failure here throws (not just resolves with `{ error }`),
 * and an uncaught throw in edge middleware is a harsher failure mode than an
 * uncaught throw in a Server Component — there is no per-route error.tsx for
 * middleware to fall back to.
 */

const getUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { proxy } from "@/proxy";

describe("proxy (console session refresh)", () => {
  it("returns a response as normal when the refresh succeeds", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });

    const response = await proxy(new NextRequest("http://localhost/console"));

    expect(response).toBeTruthy();
  });

  it("still returns a response when the refresh throws (Supabase unreachable)", async () => {
    getUser.mockRejectedValue(new TypeError("fetch failed"));

    await expect(proxy(new NextRequest("http://localhost/console"))).resolves.toBeTruthy();
  });
});
