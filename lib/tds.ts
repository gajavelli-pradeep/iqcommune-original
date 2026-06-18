export interface TdsResult {
  applicable: boolean;
  rate: number;
  tdsAmount: number;
  netAmount: number;
}

// Section 194J: TDS applies only once cumulative payments to the same
// deductor in a financial year exceed ₹30,000. Caller must pass the
// year-to-date total (before this session) so the threshold is respected.
export const SECTION_194J_ANNUAL_THRESHOLD = 30_000;

export function calculateTds(
  grossAmount: number,
  hasPan: boolean,
  cumulativeYtd = 0
): TdsResult {
  if (cumulativeYtd + grossAmount <= SECTION_194J_ANNUAL_THRESHOLD) {
    return { applicable: false, rate: 0, tdsAmount: 0, netAmount: grossAmount };
  }
  const rate = hasPan ? 10 : 20;
  const tdsAmount = Math.round((grossAmount * rate) / 100);
  return { applicable: true, rate, tdsAmount, netAmount: grossAmount - tdsAmount };
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
