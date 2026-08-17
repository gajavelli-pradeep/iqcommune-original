// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { FEEDBACK_INBOX } from "@/constants/inboxes";

/**
 * A rating is recorded, and then somebody is told about it.
 *
 * The second half is the new one and the easier one to get wrong, because it
 * must never cost the first. A rating that saved and then answered "something
 * went wrong" — because a mail provider was slow, or the session lookup
 * failed — invites the person to submit it again, and the second attempt is
 * refused as a duplicate. So the notice is asserted, and so is its
 * powerlessness to break the submission.
 */

const ASSIGNMENT = "3a0f1e5c-2b6d-4c8a-9f21-7d4e6b1a0c93";

const SESSION = {
  practitioner: "Vikram Kulkarni",
  module: "Equity Investing Simplified",
  sessionDate: "20 Aug 2026",
  city: "Bengaluru",
  reference: "IQC-S0007",
  requestedBy: "Rohan Mehta",
};

const mocks = vi.hoisted(() => ({
  recordRating: vi.fn(async () => ({ at: "2026-08-17T10:00:00.000Z" })),
  // Typed nullable because the real one is: a missing session is a case the
  // route handles, and a stub that cannot express it would not let us test it.
  getRatedSession: vi.fn(async (): Promise<typeof SESSION | null> => SESSION),
  dispatchEmail: vi.fn(),
  verifyToken: vi.fn(() => ({ ok: true, payload: { id: ASSIGNMENT } })),
  checkRateLimit: vi.fn(async () => ({ allowed: true, enforced: true })),
}));

// The real error classes stay: the route branches on `instanceof`, and a
// stand-in would make that branch pass here and fail in production.
vi.mock("@/services/link-writes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/link-writes")>()),
  recordRating: mocks.recordRating,
}));
vi.mock("@/services/link-pages", () => ({ getRatedSession: mocks.getRatedSession }));
vi.mock("@/lib/email/dispatch", () => ({ dispatchEmail: mocks.dispatchEmail }));
vi.mock("@/lib/tokens", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clientIdentifier: () => "test",
}));

const { POST } = await import("@/app/api/ratings/route");

const submit = (body: Record<string, unknown>) =>
  POST(
    new Request("https://iqcommune.com/api/ratings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ t: "token", ...body }),
    }),
  );

/** The message handed to `dispatchEmail`, which is the whole of what was sent. */
const sent = () => mocks.dispatchEmail.mock.calls.at(-1)?.[1];

describe("a submitted rating reaches the inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRatedSession.mockResolvedValue(SESSION);
    mocks.recordRating.mockResolvedValue({ at: "2026-08-17T10:00:00.000Z" });
    process.env.NEXT_PUBLIC_BASE_URL = "https://iqcommune.com";
  });

  it("sends the stars and the comment to pg@iqcommune.com", async () => {
    const response = await submit({ rating: 4, comments: "Clear and practical throughout." });

    expect(response.status).toBe(201);
    expect(mocks.dispatchEmail).toHaveBeenCalledTimes(1);
    expect(sent().to).toBe(FEEDBACK_INBOX);
    expect(sent().to).toBe("pg@iqcommune.com");
    expect(sent().body).toContain("Clear and practical throughout.");
    expect(sent().body).toContain("(4/5)");
  });

  it("names the session and the practitioner, so the mail can be acted on", async () => {
    await submit({ rating: 5, comments: "Excellent." });

    const body = sent().body;
    expect(body).toContain("Vikram Kulkarni");
    expect(body).toContain("IQC-S0007");
    expect(body).toContain("Rohan Mehta");
    expect(sent().subject).toContain("IQC-S0007");
  });

  it("still sends when no comment was left", async () => {
    // The comment is optional on the form; the stars are the rating. Sending
    // only when somebody typed something would drop most of the feedback.
    await submit({ rating: 2 });

    expect(mocks.dispatchEmail).toHaveBeenCalledTimes(1);
    expect(sent().body).toContain("No comment left.");
    expect(sent().body).toContain("(2/5)");
  });

  it("records the rating even when the notice cannot be sent", async () => {
    // The failure that matters. The rating is saved by this point, so the
    // person must be told it worked — being told to retry would send them into
    // a duplicate that gets refused.
    mocks.dispatchEmail.mockImplementation(() => {
      throw new Error("mail provider down");
    });

    const response = await submit({ rating: 3, comments: "Fine." });

    expect(response.status).toBe(201);
    expect(mocks.recordRating).toHaveBeenCalledTimes(1);
  });

  it("records the rating even when the session context is missing", async () => {
    // Same guarantee, the other way in: without the session there is nothing
    // worth mailing, and still nothing worth failing the submission for.
    mocks.getRatedSession.mockResolvedValue(null);

    const response = await submit({ rating: 3 });

    expect(response.status).toBe(201);
    expect(mocks.dispatchEmail).not.toHaveBeenCalled();
  });

  it("sends nothing when the link is not valid", async () => {
    // No rating was recorded, so there is no feedback to forward.
    mocks.verifyToken.mockReturnValueOnce({ ok: false, reason: "expired" } as never);

    const response = await submit({ rating: 5 });

    expect(response.status).toBe(403);
    expect(mocks.dispatchEmail).not.toHaveBeenCalled();
  });
});
