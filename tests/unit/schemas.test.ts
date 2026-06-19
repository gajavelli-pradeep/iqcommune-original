import { describe, it, expect } from "vitest";
import { ApplicationSchema } from "@/lib/schemas/application";
import { SessionRequestSchema } from "@/lib/schemas/session-request";
import { AgreementSignSchema } from "@/lib/schemas/agreement";

const validApplication = {
  firstName: "Vikram",
  lastName: "Kulkarni",
  email: "v@gmail.com",
  phone: "+91 98765 43210",
  role: "Equity Analyst",
  experience: "9 – 12 years",
  city: "Mumbai",
  modules: ["Stock Market Basics"],
  teachFreq: "Once a month",
  why: "I want to give back to the community.",
  consentOperational: true,
  consentNosell: true,
  consentEmployer: true,
  payToFamily: false,
  // payment: at least UPI or bank details required (Gap 44)
  upiId: "vikram@oksbi",
};

describe("ApplicationSchema", () => {
  it("accepts valid application", () => {
    expect(ApplicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = ApplicationSchema.safeParse({});
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("email");
    expect(paths).toContain("city");
  });

  it("rejects invalid email", () => {
    const result = ApplicationSchema.safeParse({
      ...validApplication,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty modules array", () => {
    const result = ApplicationSchema.safeParse({ ...validApplication, modules: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid IFSC", () => {
    const result = ApplicationSchema.safeParse({
      ...validApplication,
      ifsc: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid IFSC", () => {
    const result = ApplicationSchema.safeParse({
      ...validApplication,
      ifsc: "SBIN0001234",
    });
    expect(result.success).toBe(true);
  });
});

describe("SessionRequestSchema", () => {
  const valid = {
    name: "Suresh",
    org: "TechCorp",
    email: "s@t.com",
    topic: "Stock Market Basics",
    audienceType: "Groups",
    groupSize: "5–8",
    minCommit: 5,
    preferredDates: "July",
  };

  it("accepts valid request", () => {
    expect(SessionRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects minCommit < 1", () => {
    expect(
      SessionRequestSchema.safeParse({ ...valid, minCommit: 0 }).success
    ).toBe(false);
  });

  it("rejects invalid topic", () => {
    expect(
      SessionRequestSchema.safeParse({ ...valid, topic: "Crypto Trading" }).success
    ).toBe(false);
  });
});

describe("AgreementSignSchema", () => {
  it("accepts valid sign payload", () => {
    expect(
      AgreementSignSchema.safeParse({
        ref: "IQC-EMP-0042",
        fullName: "Vikram Kulkarni",
        designation: "Equity Analyst",
        sigMode: "typed",
        sigData: "Vikram Kulkarni",
      }).success
    ).toBe(true);
  });

  it("rejects empty fullName", () => {
    expect(
      AgreementSignSchema.safeParse({
        ref: "IQC-EMP-0042",
        fullName: "",
        designation: "Analyst",
        sigMode: "typed",
        sigData: "Name",
      }).success
    ).toBe(false);
  });

  it("rejects invalid sigMode", () => {
    expect(
      AgreementSignSchema.safeParse({
        ref: "IQC-EMP-0042",
        fullName: "Test",
        designation: "Analyst",
        sigMode: "scan",
        sigData: "data",
      }).success
    ).toBe(false);
  });
});
