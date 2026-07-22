/**
 * The single module taxonomy (audit M4).
 *
 * These six names were declared independently in several places — the Zod
 * application schema, the DB CHECK constraint (migration 0005), the forms and
 * the marketing sections — and were already at risk of drifting apart. This is
 * the one source of truth: schemas build their enum off it (`z.enum(MODULES)`),
 * and any list of modules imports from here rather than re-typing it.
 *
 * The strings are load-bearing: they must match the `modules_domain` CHECK in
 * migration 0005 byte-for-byte, or a valid submission is rejected at the DB.
 */
export const MODULES = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
] as const;

export type Module = (typeof MODULES)[number];
