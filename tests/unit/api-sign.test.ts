import { describe, it, expect, vi, beforeAll } from "vitest";
import { POST } from "@/app/api/onboarding/sign/route";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.HMAC_SECRET = "test-secret-32-chars-minimum-x12";
});

const mockSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  }),
}));

describe("POST /api/onboarding/sign", () => {
  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/onboarding/sign", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing fullName", async () => {
    const req = new NextRequest("http://localhost/api/onboarding/sign", {
      method: "POST",
      body: JSON.stringify({
        ref: "IQC-EMP-0042",
        fullName: "",
        designation: "Analyst",
        sigMode: "typed",
        sigData: "Test Name",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when ref not found in agreements table", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

    const req = new NextRequest("http://localhost/api/onboarding/sign", {
      method: "POST",
      body: JSON.stringify({
        ref: "IQC-EMP-NONEXISTENT",
        fullName: "Vikram Kulkarni",
        designation: "Equity Analyst",
        sigMode: "typed",
        sigData: "Vikram Kulkarni",
      }),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 409 when agreement already signed", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "uuid-1", practitioner_id: "p-uuid", status: "Active" },
      error: null,
    });

    const req = new NextRequest("http://localhost/api/onboarding/sign", {
      method: "POST",
      body: JSON.stringify({
        ref: "IQC-EMP-0042",
        fullName: "Vikram Kulkarni",
        designation: "Equity Analyst",
        sigMode: "typed",
        sigData: "Vikram Kulkarni",
      }),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
