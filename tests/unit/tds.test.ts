import { describe, it, expect } from "vitest";
import { calculateTds } from "@/lib/tds";

describe("calculateTds", () => {
  it("10% TDS with PAN", () => {
    expect(calculateTds(10000, true)).toEqual({
      applicable: true,
      rate: 10,
      tdsAmount: 1000,
      netAmount: 9000,
    });
  });

  it("20% TDS without PAN", () => {
    expect(calculateTds(10000, false)).toEqual({
      applicable: true,
      rate: 20,
      tdsAmount: 2000,
      netAmount: 8000,
    });
  });

  it("rounds fractional TDS amounts", () => {
    const result = calculateTds(9999, true);
    expect(result.tdsAmount).toBe(1000);
    expect(result.netAmount).toBe(8999);
  });

  it("applicable is always true (conservative — admin overrides per session)", () => {
    expect(calculateTds(5000, true).applicable).toBe(true);
  });
});
