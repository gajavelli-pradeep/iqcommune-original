import { describe, expect, it } from "vitest";
import {
  formatInr,
  formatNumber,
  futureValueOfAnnualContribution,
} from "./format";

describe("formatInr", () => {
  it("compresses crores, lakhs and thousands the Indian way", () => {
    expect(formatInr(47_000_000)).toBe("₹4.7Cr");
    expect(formatInr(250_000)).toBe("₹2.5L");
    expect(formatInr(60_000)).toBe("₹60K");
  });

  it("falls back to full grouping below a thousand", () => {
    expect(formatInr(999)).toBe("₹999");
    expect(formatInr(0)).toBe("₹0");
  });

  it("switches units exactly at each boundary", () => {
    expect(formatInr(1_000)).toBe("₹1K");
    expect(formatInr(100_000)).toBe("₹1.0L");
    expect(formatInr(10_000_000)).toBe("₹1.0Cr");
  });
});

describe("formatNumber", () => {
  it("keeps whole numbers whole", () => {
    expect(formatNumber(24)).toBe("24");
  });

  it("gives one decimal to fractions by default", () => {
    expect(formatNumber(23.456)).toBe("23.5");
  });
});

describe("futureValueOfAnnualContribution", () => {
  it("compounds a yearly contribution over the term", () => {
    // ₹1,00,000/yr for 10 years at 10% — the budget checker's projection.
    const value = futureValueOfAnnualContribution(100_000, 10, 0.1);
    expect(Math.round(value)).toBe(1_753_117);
  });

  it("returns the contribution itself grown one period for a single year", () => {
    expect(futureValueOfAnnualContribution(1_000, 1, 0.1)).toBeCloseTo(1_100, 5);
  });
});
