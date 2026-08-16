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
// Only the write is stubbed. `PhotoSubmissionError` stays real, because the
// route branches on `instanceof` — a stand-in class would make that branch
// pass here and fail in production, which is the opposite of useful.
vi.mock("@/services/photo-submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/photo-submissions")>()),
  createPhotoSubmission: mocks.createPhotoSubmission,
}));
vi.mock("@/lib/tokens", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  clientIdentifier: () => "test",
}));

const { POST } = await import("@/app/api/photo-submissions/route");
const { PhotoSubmissionError } = await import("@/services/photo-submissions");

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

  it("names the file when its bytes are not really an image", async () => {
    // The sender's to fix, and the only one here that is — so it is a 400 that
    // says which file and what to do, not a 500 asking them to try again.
    mocks.getPhotoSubmissionOwner.mockResolvedValueOnce(owner(AHEAD));
    mocks.createPhotoSubmission.mockRejectedValueOnce(
      new PhotoSubmissionError("content", '"holiday.jpg" is not a JPEG or PNG inside.'),
    );

    const response = await POST(upload());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("holiday.jpg");
    expect(body.error.message).not.toContain("Something went wrong");
  });

  it("says storage failed, rather than apologising in general", async () => {
    // Not the sender's fault and not fixed by retrying blindly. The trace id
    // goes in the message so a screenshot is enough to find the log line.
    mocks.getPhotoSubmissionOwner.mockResolvedValueOnce(owner(AHEAD));
    mocks.createPhotoSubmission.mockRejectedValueOnce(
      new PhotoSubmissionError("storage", "The photos could not be stored.", new Error("bucket gone")),
    );

    const response = await POST(upload());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toContain("could not be stored");
    expect(body.error.message).toContain(body.error.traceId);
    // The underlying reason stays in the log, not on a practitioner's screen.
    expect(body.error.message).not.toContain("bucket gone");
  });

  it("carries a trace id even when nothing named the failure", async () => {
    mocks.getPhotoSubmissionOwner.mockResolvedValueOnce(owner(AHEAD));
    mocks.createPhotoSubmission.mockRejectedValueOnce(new Error("something unexpected"));

    const response = await POST(upload());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toContain(body.error.traceId);
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
