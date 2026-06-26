import { describe, it, expect } from "vitest";
import { calculateTds } from "@/lib/tds";

// Section 194J only bites once cumulative YTD payments cross ₹30,000, so each
// "applies" case passes a cumulativeYtd that puts it over the threshold; the
// "not applicable" case stays under it.
describe("calculateTds", () => {
  it("10% TDS with PAN once over the 194J threshold", () => {
    expect(calculateTds(10000, true, 30000)).toEqual({
      applicable: true,
      rate: 10,
      tdsAmount: 1000,
      netAmount: 9000,
    });
  });

  it("20% TDS without PAN once over the 194J threshold", () => {
    expect(calculateTds(10000, false, 30000)).toEqual({
      applicable: true,
      rate: 20,
      tdsAmount: 2000,
      netAmount: 8000,
    });
  });

  it("rounds fractional TDS amounts", () => {
    const result = calculateTds(9999, true, 30000);
    expect(result.tdsAmount).toBe(1000);
    expect(result.netAmount).toBe(8999);
  });

  it("not applicable below the ₹30,000 194J annual threshold", () => {
    expect(calculateTds(5000, true)).toEqual({
      applicable: false,
      rate: 0,
      tdsAmount: 0,
      netAmount: 5000,
    });
  });

  it("becomes applicable once cumulative YTD crosses the threshold", () => {
    const result = calculateTds(5000, true, 28000); // 33,000 > 30,000
    expect(result.applicable).toBe(true);
    expect(result.tdsAmount).toBe(500);
    expect(result.netAmount).toBe(4500);
  });
});
