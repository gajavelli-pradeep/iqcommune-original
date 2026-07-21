/**
 * Currency and number formatting for the calculators.
 *
 * Indian numbering: figures compress to Cr / L / K exactly as the spec's `fmt`
 * does, because a retirement corpus reads as "₹4.7Cr", not "₹47,000,000".
 * Below ₹1,000 it falls back to full en-IN grouping.
 */
export function formatInr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** Whole numbers stay whole; everything else gets one decimal by default. */
export function formatNumber(value: number, decimals = 1): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(decimals);
}

/**
 * Future value of a monthly investment compounded annually.
 * Used by the budget checker's projection and by the SIP visualiser.
 */
export function futureValueOfAnnualContribution(
  annualAmount: number,
  years: number,
  annualRate: number,
): number {
  const growth = (Math.pow(1 + annualRate, years) - 1) / annualRate;
  return annualAmount * growth * (1 + annualRate);
}
