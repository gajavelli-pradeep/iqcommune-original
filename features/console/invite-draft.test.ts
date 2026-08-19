import { beforeEach, describe, expect, it, vi } from "vitest";

import { LINK_PLACEHOLDER } from "./draft-kinds";

/**
 * The invite draft shows the link an admin is about to send (client,
 * 2026-08-19 — was masked behind `LINK_PLACEHOLDER` until now, unlike the
 * agreement draft next to it, which never was).
 *
 * There is no row to read here at all — unlike the agreement, an invite has
 * no "resend" case, so every compose is a first issue: the dialog settles the
 * id the send will create the row under and shows a link to that, the same
 * way `agreement-draft.test.ts` already proves for the agreement.
 */

const mocks = vi.hoisted(() => ({ requireCapability: vi.fn() }));

vi.mock("./requireRole", () => ({
  requireCapability: mocks.requireCapability,
  getConsoleSession: vi.fn(),
}));

// `composeDraft` creates an admin client unconditionally before dispatching
// to a kind's own branch, even though `admin-invite`'s never reads from it —
// there is no row to read for a kind with no resend case. Stubbed, not left
// real, for the same reason `agreement-draft.test.ts` stubs it: a real client
// needs the full env this test process does not carry.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

describe("the invite draft", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_URL = "https://iqcommune.com";
    process.env.HMAC_SECRET = "test-secret-for-signing-only";
    mocks.requireCapability.mockResolvedValue({ email: "admin@iqcommune.com" });
  });

  /** `admin-invite`'s own id shape — role, then the address (see actions.ts). */
  const compose = async (role = "admin", email = "priya@example.com") => {
    const { composeDraft } = await import("./actions");
    return composeDraft("admin-invite", `${role}:${email}`);
  };

  it("shows the real link, not the placeholder", async () => {
    const draft = await compose();

    expect(draft).not.toBeNull();
    expect(draft!.body).not.toContain(LINK_PLACEHOLDER);
    expect(draft!.body).toContain("https://iqcommune.com/join-admin?t=");
  });

  it("shows a link that actually opens the invite", async () => {
    const draft = await compose();
    const token = draft!.body.match(/\?t=(\S+)/)?.[1];
    expect(token, "the body carries a token to check").toBeTruthy();

    const { verifyToken } = await import("@/lib/tokens");
    const result = verifyToken("invite", token);

    expect(result.ok, "the previewed token verifies").toBe(true);
    // And opens the id travelling back as `linkId`, not merely something.
    expect(result.ok && result.payload.id).toBe(draft!.linkId);
    // Minted for this flow alone — a token replayed against another page must
    // fail, which is what `k` in the payload is for.
    expect(verifyToken("consent", token).ok).toBe(false);
  });

  it("shows it in the WhatsApp copy too, which leaves by the clipboard", async () => {
    const draft = await compose();

    expect(draft!.whatsapp).toContain("https://iqcommune.com/join-admin?t=");
    expect(draft!.whatsapp).not.toContain(LINK_PLACEHOLDER);
  });

  it("hands back the id it chose, so the send creates the row under it", async () => {
    const draft = await compose();

    expect(draft!.linkId).toBeTruthy();
  });

  it("never falls back to the shared preview id", async () => {
    // That stand-in uuid was the same for every invite. A link against it
    // would open one row for everyone, which is the failure masking existed
    // to prevent and which choosing a fresh id per draft now replaces.
    const draft = await compose();

    expect(draft!.body).not.toContain("00000000-0000-4000-8000-000000000000");
    expect(draft!.linkId).not.toBe("00000000-0000-4000-8000-000000000000");
  });

  it("chooses a different id for each draft, and writes none of them", async () => {
    // Two previews, two ids: nothing is reserved, so nothing is shared. There
    // is no database mock here at all — reaching for one would throw, which
    // is what keeps "a preview leaves no trace" honest for a kind with no row
    // to read in the first place.
    const first = await compose();
    const second = await compose();

    expect(first!.linkId).toBeTruthy();
    expect(second!.linkId).toBeTruthy();
    expect(first!.linkId).not.toBe(second!.linkId);
  });

  it("names the role the address was invited as", async () => {
    const draft = await compose("global_admin", "priya@example.com");

    expect(draft!.body).toContain("Global Admin");
  });
});
