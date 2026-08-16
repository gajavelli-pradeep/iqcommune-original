// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

/**
 * The tokened upload, end to end through the route.
 *
 * The schema tests prove which rules apply where. These prove the route picks
 * the right set and says something useful when it still refuses — the two
 * halves of the failure a practitioner actually hit: a submission rejected for
 * a future session date, explained as "please check the highlighted fields" on
 * a form that has no such field to highlight.
 */

const ASSIGNMENT = "3a0f1e5c-2b6d-4c8a-9f21-7d4e6b1a0c93";

const mocks = vi.hoisted(() => ({
  getPhotoSubmissionOwner: vi.fn(),
  createPhotoSubmission: vi.fn(async () => ({ id: "sub-1", photoCount: 1 })),
  verifyToken: vi.fn(() => ({ ok: true, payload: { id: ASSIGNMENT } })),
  checkRateLimit: vi.fn(async () => ({ allowed: true, enforced: true })),
}));

vi.mock("@/services/link-pages", () => ({
  getPhotoSubmissionOwner: mocks.getPhotoSubmissionOwner,
}));
vi.mock("@/services/photo-submissions", () => ({
  createPhotoSubmission: mocks.createPhotoSubmission,
}));
vi.mock("@/lib/tokens", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clientIdentifier: () => "test",
}));

const { POST } = await import("@/app/api/photo-submissions/route");

/** A session a month out — the state the photo guide is sent in. */
const AHEAD = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const owner = (sessionDate: string) => ({
  sessionId: "s-1",
  practitionerId: "p-1",
  practitionerName: "Vikram Varma",
  practitionerEmail: "vikram@example.com",
  sessionDate,
  module: "Equity Investing Simplified",
});

function upload() {
  const form = new FormData();
  form.set("t", "a-token");
  form.append("photos", new File([new Uint8Array([1, 2, 3])], "room.jpg", { type: "image/jpeg" }));
  return new Request("http://localhost/api/photo-submissions", { method: "POST", body: form });
}

describe("uploading through the emailed link", () => {
  it("accepts photos for a session that has not happened yet", async () => {
    // The guide is sent ahead of the session and says to bookmark the link, so
    // this is the ordinary case rather than an edge one.
    mocks.getPhotoSubmissionOwner.mockResolvedValueOnce(owner(AHEAD));

    const response = await POST(upload());
    expect(response.status).toBe(201);
    expect(mocks.createPhotoSubmission).toHaveBeenCalled();
  });

  it("explains a refusal instead of pointing at fields that are not there", async () => {
    // This page shows the top-level message and nothing else, so that sentence
    // is the whole of what the practitioner reads.
    mocks.getPhotoSubmissionOwner.mockResolvedValueOnce(owner("not a date"));

    const response = await POST(upload());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("Choose the date of the session");
    expect(body.error.message).toContain("session record");
    expect(body.error.message).not.toContain("highlighted fields");
  });
});
