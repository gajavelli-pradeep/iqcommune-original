import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/applications/route";
import { NextRequest } from "next/server";

const mockSelect = vi.fn().mockResolvedValue({ count: 5, error: null });
const mockInsert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "practitioners") {
        return {
          select: () => ({
            count: "exact",
            head: true,
            then: mockSelect,
          }),
          insert: mockInsert,
        };
      }
      return { select: mockSelect, insert: mockInsert };
    },
  }),
}));

const validBody = {
  firstName: "Vikram",
  lastName: "Kulkarni",
  email: "v@gmail.com",
  phone: "+91 98765 43210",
  role: "Equity Analyst",
  experience: "9 – 12 years",
  city: "Mumbai",
  modules: ["Equity Investing Simplified"],
  teachFreq: "Once a month",
  why: "I want to give back to the community.",
  consentOperational: true,
  consentNosell: true,
  consentEmployer: true,
};

describe("POST /api/applications", () => {
  beforeEach(() => {
    mockInsert.mockReturnValue({
      select: () =>
        Promise.resolve({
          data: { id: "uuid-1", ref_code: "0006" },
          error: null,
        }),
    });
  });

  it("returns 400 on invalid body", async () => {
    const req = new NextRequest("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ email: "bad-email" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on empty modules array", async () => {
    const req = new NextRequest("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ ...validBody, modules: [] }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/applications", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
