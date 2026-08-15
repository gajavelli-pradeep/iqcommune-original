import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mintToken } from "@/lib/tokens";

import { POST } from "./route";

/**
 * The welcome email is a decision, not a side effect of signing.
 *
 * This route used to empanel the practitioner and dispatch `practitioner-welcome`
 * in the same breath — the one message in the product that reached a
 * practitioner without an admin having read it. The send now belongs to "Send
 * welcome message" on the console profile, where the draft dialog opens first.
 *
 * The absence is what is asserted, because nothing else would notice it: the
 * signature still records and the practitioner still turns Empanelled either
 * way, so without this the two lines come back the first time someone reads the
 * route and concludes the welcome was forgotten.
 */

/** A real v4 uuid: the route hands this straight to the service as a row id. */
const AGREEMENT_ID = "3a0f1e5c-2b6d-4c8a-9f21-7d4e6b1a0c93";

const mocks = vi.hoisted(() => ({
  signAgreement: vi.fn(),
  empanelBySignature: vi.fn(),
  dispatchEmail: vi.fn(),
  archiveSignedAgreement: vi.fn(),
}));

/**
 * Archiving renders a PDF and uploads it, so it needs a Supabase client. Mocked
 * for the same reason the limiter is: it happens to stay hermetic today only
 * because `createAdminClient` throws without env and the archive swallows it —
 * a test that passes by accident stops passing when the accident changes.
 */
vi.mock("@/services/agreement-archive", () => ({
  archiveSignedAgreement: mocks.archiveSignedAgreement,
}));

vi.mock("@/services/link-writes", () => ({
  signAgreement: mocks.signAgreement,
  empanelBySignature: mocks.empanelBySignature,
  // Imported by the route for its `instanceof` branches; neither is thrown on
  // the path under test, so a bare subclass is the whole shape needed.
  AlreadyRecordedError: class AlreadyRecordedError extends Error {},
  LinkNoLongerValidError: class LinkNoLongerValidError extends Error {},
}));

/**
 * `dispatchEmail` is the only email primitive a route may call (see
 * `lib/email/dispatch`), so a spy on it alone is a complete account of what this
 * request tried to send.
 */
vi.mock("@/lib/email/dispatch", () => ({ dispatchEmail: mocks.dispatchEmail }));

/**
 * The limiter is the route's one network dependency, and it runs before every
 * assertion below. CI sets `UPSTASH_REDIS_REST_*`, so the real `checkRateLimit`
 * dials Upstash, the rejection reaches the route's generic `catch`, and both
 * cases return 500 — a suite that passes only on a machine with no credentials
 * configured is testing the machine, not the route.
 *
 * `clientIdentifier` is kept real: the IP it derives is what the happy path
 * asserts `signAgreement` received, so stubbing it would assert the stub.
 */
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: async () => ({ allowed: true, enforced: true }),
}));

function signRequest(token: string): Request {
  return new Request("http://localhost/api/agreements", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.4" },
    body: JSON.stringify({
      t: token,
      fullName: "Vikram Kulkarni",
      signature: "Vikram Kulkarni",
      signatureMode: "typed",
    }),
  });
}

beforeEach(() => {
  // Read at call time by mint and verify alike, so stubbing here is enough.
  vi.stubEnv("HMAC_SECRET", "a-test-secret-at-least-32-chars-long");
  mocks.signAgreement.mockResolvedValue({ at: "2026-08-15T09:00:00.000Z" });
  mocks.empanelBySignature.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/agreements", () => {
  it("empanels the signer and sends nothing", async () => {
    const response = await POST(signRequest(mintToken("onboarding", AGREEMENT_ID, 3600)));

    expect(response.status).toBe(201);
    expect(mocks.signAgreement).toHaveBeenCalledWith(AGREEMENT_ID, expect.anything(), "203.0.113.4");
    expect(mocks.empanelBySignature).toHaveBeenCalledWith(AGREEMENT_ID);
    expect(mocks.dispatchEmail).not.toHaveBeenCalled();
    // The signed document is kept at this moment, not re-made on download. If
    // this stops happening the download silently starts answering with whatever
    // the contract text says today, under a signature given to the old one.
    expect(mocks.archiveSignedAgreement).toHaveBeenCalledWith(expect.any(String), AGREEMENT_ID);
  });

  it("sends nothing when the token is not a valid onboarding link", async () => {
    // The rejected path matters as much as the accepted one: an email dispatched
    // before the token check would reach whoever the id happens to name.
    const response = await POST(signRequest(mintToken("consent", AGREEMENT_ID, 3600)));

    expect(response.status).toBe(403);
    expect(mocks.signAgreement).not.toHaveBeenCalled();
    expect(mocks.dispatchEmail).not.toHaveBeenCalled();
    // Nothing signed means nothing to keep — an archive here would be a
    // contract object for an agreement that was never executed.
    expect(mocks.archiveSignedAgreement).not.toHaveBeenCalled();
  });
});
