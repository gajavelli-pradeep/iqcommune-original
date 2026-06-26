import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/session-requests/route";
import { NextRequest } from "next/server";

const mockInsert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

const validBody = {
  name: "Suresh Patel",
  org: "TechCorp",
  email: "s@techcorp.in",
  topic: "Equity Investing Simplified",
  audienceType: "Organisations & Institutions",
  groupSize: "16–20",
  minCommit: 16,
  preferredDates: "July 2nd week",
};

describe("POST /api/session-requests", () => {
  beforeEach(() => {
    mockInsert.mockReturnValue({
      select: () =>
        Promise.resolve({
          data: { id: "uuid-2", ref_code: null },
          error: null,
        }),
    });
  });

  it("returns 400 on missing topic", async () => {
    const req = new NextRequest("http://localhost/api/session-requests", {
      method: "POST",
      body: JSON.stringify({ ...validBody, topic: undefined }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on minCommit < 1", async () => {
    const req = new NextRequest("http://localhost/api/session-requests", {
      method: "POST",
      body: JSON.stringify({ ...validBody, minCommit: 0 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid audience type", async () => {
    const req = new NextRequest("http://localhost/api/session-requests", {
      method: "POST",
      body: JSON.stringify({ ...validBody, audienceType: "Random Type" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/session-requests", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
