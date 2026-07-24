import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The auth boundary itself, tested against a mocked Supabase client rather
 * than a real one: what matters here is the branching — valid session, no
 * session, wrong role, and a Supabase the network can't reach — not the
 * client's own behaviour.
 *
 * `redirect()` throws inside Next.js by design (it carries a `NEXT_REDIRECT`
 * digest that the framework intercepts). The mock reproduces just the "throws
 * with an identifiable message" part so a test can assert which path was
 * taken without dragging in Next's routing internals.
 */

const getUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { redirect } from "next/navigation";

import { BackendUnavailableError, getConsoleSession, requireRole } from "./requireRole";

function userResult(role: string | undefined, email = "a@example.com") {
  return {
    data: { user: { app_metadata: { role }, email } },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireRole", () => {
  it("returns the role and email for a valid session with a matching role", async () => {
    getUser.mockResolvedValue(userResult("admin"));

    await expect(requireRole("admin")).resolves.toEqual({
      role: "admin",
      email: "a@example.com",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when getUser resolves with an error", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /login when getUser resolves with no user", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to the role's own route when the role does not match", async () => {
    getUser.mockResolvedValue(userResult("user"));

    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/user");
  });

  it("rejects with BackendUnavailableError, not a redirect, when getUser throws", async () => {
    getUser.mockRejectedValue(new Error("fetch failed"));

    await expect(requireRole("admin")).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("getConsoleSession", () => {
  it("returns the role and email for a valid session", async () => {
    getUser.mockResolvedValue(userResult("global_admin"));

    await expect(getConsoleSession()).resolves.toEqual({
      role: "global_admin",
      email: "a@example.com",
    });
  });

  it("redirects to /login when there is no valid session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(getConsoleSession()).rejects.toThrow("REDIRECT:/login");
  });

  it("rejects with BackendUnavailableError, not a redirect, when getUser throws", async () => {
    getUser.mockRejectedValue(new Error("network down"));

    await expect(getConsoleSession()).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(redirect).not.toHaveBeenCalled();
  });
});
