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

import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { BackendUnavailableError, getConsoleSession, requireRole } from "./requireRole";

function userResult(role: string | undefined, email = "a@example.com", fullName?: string) {
  return {
    data: { user: { app_metadata: { role }, email, user_metadata: { full_name: fullName } } },
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
      name: null,
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("reads the account's name from user_metadata when one is on file", async () => {
    getUser.mockResolvedValue(userResult("admin", "a@example.com", "Lekkala Ganesh"));

    await expect(requireRole("admin")).resolves.toEqual({
      role: "admin",
      email: "a@example.com",
      name: "Lekkala Ganesh",
    });
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

  it("rejects with BackendUnavailableError, not a /login redirect, when getUser resolves with a retryable fetch error", async () => {
    // The real failure mode for a network-level Supabase outage: verified
    // directly against @supabase/supabase-js (a DNS failure resolves with
    // this error rather than throwing) rather than assumed. Getting this
    // wrong sends an admin to the login page during an outage with no signal
    // that anything is actually broken.
    getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    });

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
      name: null,
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

  it("rejects with BackendUnavailableError, not a /login redirect, when getUser resolves with a retryable fetch error", async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError("fetch failed", 0),
    });

    await expect(getConsoleSession()).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(redirect).not.toHaveBeenCalled();
  });
});
