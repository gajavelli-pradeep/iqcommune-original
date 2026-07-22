import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useApiSubmit } from "./useApiSubmit";

/**
 * The shared submit path (audit H8). Its three outcomes — ok envelope, error
 * envelope, and network rejection (the branch no form test hit) — each drive a
 * distinct UI, so each is pinned here.
 */
afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("useApiSubmit", () => {
  it("returns the data envelope and no error on success", async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ data: { at: "2026-07-22T00:00:00Z" }, error: null }), {
        status: 201,
      }),
    );
    const { result } = renderHook(() => useApiSubmit("tok"));

    let receipt: unknown;
    await act(async () => {
      receipt = await result.current.submit("/api/ratings", { rating: 5 });
    });

    expect(receipt).toEqual({ at: "2026-07-22T00:00:00Z" });
    expect(result.current.error).toBeUndefined();
    expect(result.current.busy).toBe(false);
  });

  it("surfaces the server error message and returns null on a non-ok response", async () => {
    stubFetch(() =>
      new Response(
        JSON.stringify({ data: null, error: { code: "CONFLICT", message: "Already done." } }),
        { status: 409 },
      ),
    );
    const { result } = renderHook(() => useApiSubmit("tok"));

    let receipt: unknown = "sentinel";
    await act(async () => {
      receipt = await result.current.submit("/api/consents");
    });

    expect(receipt).toBeNull();
    expect(result.current.error).toBe("Already done.");
  });

  it("shows a recovery message and returns null when the network rejects", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const { result } = renderHook(() => useApiSubmit("tok"));

    let receipt: unknown = "sentinel";
    await act(async () => {
      receipt = await result.current.submit("/api/consents");
    });

    expect(receipt).toBeNull();
    expect(result.current.error).toMatch(/couldn.t reach the server/i);
  });

  it("sends the token in the body alongside the payload", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ data: { at: "t" }, error: null }), { status: 201 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApiSubmit("the-token"));

    await act(async () => {
      await result.current.submit("/api/ratings", { rating: 4 });
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const body = JSON.parse(calls[0][1].body as string);
    expect(body).toEqual({ t: "the-token", rating: 4 });
  });
});
