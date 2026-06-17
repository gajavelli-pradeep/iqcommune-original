export interface TdsResult {
  applicable: boolean;
  rate: number;
  tdsAmount: number;
  netAmount: number;
}

// Section 194J: 10% with PAN, 20% without PAN
export function calculateTds(grossAmount: number, hasPan: boolean): TdsResult {
  const rate = hasPan ? 10 : 20;
  const tdsAmount = Math.round((grossAmount * rate) / 100);
  return {
    applicable: true,
    rate,
    tdsAmount,
    netAmount: grossAmount - tdsAmount,
  };
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
