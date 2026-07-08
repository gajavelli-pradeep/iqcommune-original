import { z } from "zod";

export const AUDIENCE_OPTIONS = [
  "Groups",
  "Organisations & Institutions",
  "AMCs & Wealth Firms",
] as const;

export const GROUP_SIZE_OPTIONS = ["5-8", "9-15", "16-25"] as const;

export const MODULES = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
] as const;

export const BUNDLES = [
  "Bundle — Foundations of Personal Finance + Retirement & Goal-Based Financial Planning (6 hrs)",
  "Bundle — Equity Investing Simplified + Debt & Fixed Income Investing (6 hrs)",
  "Bundle — Asset Allocation & Portfolio Construction + Investment Solutions & Portfolio Strategies (6 hrs)",
] as const;

// Short display labels for the bundle <select> options. VALUES above stay canonical
// (they power TOPICS + validation + the persisted `topic`); only the visible text shortens.
export const BUNDLE_LABELS: Record<(typeof BUNDLES)[number], string> = {
  "Bundle — Foundations of Personal Finance + Retirement & Goal-Based Financial Planning (6 hrs)":
    "Foundations + Retirement & Goals",
  "Bundle — Equity Investing Simplified + Debt & Fixed Income Investing (6 hrs)":
    "Equity + Debt & Fixed Income",
  "Bundle — Asset Allocation & Portfolio Construction + Investment Solutions & Portfolio Strategies (6 hrs)":
    "Asset Allocation + Portfolio Strategies",
};

// Flat list used by form <select> and API validation.
export const TOPICS = [...MODULES, ...BUNDLES, "Not sure — help me choose"] as const;

export const SessionRequestSchema = z
  .object({
    firstName:       z.string().min(1, "Required"),
    lastName:        z.string().optional(),
    email:           z.string().email("Invalid email"),
    phone:           z.string().min(6, "Required"),
    city:            z.string().min(1, "Required"),
    state:           z.string().min(1, "Required"),
    audienceType:    z.enum(AUDIENCE_OPTIONS, { message: "Select audience type" }),
    orgName:         z.string().optional(),
    topic:           z.enum(TOPICS, { message: "Select a valid topic" }),
    groupSize:       z.enum(GROUP_SIZE_OPTIONS).optional(),
    minCommit:       z.number().int().min(1).optional(),
    venue:           z.string().optional(),
    preferredDates:  z.string().min(1, "Required"),
    notes:           z.string().optional(),
    spocDeclaration: z.literal(true, { message: "SPOC declaration is required" }),
  })
  .superRefine((data, ctx) => {
    if (data.audienceType === "Groups" && !data.groupSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Group size is required",
        path: ["groupSize"],
      });
    }
    if (data.audienceType === "Groups" && !data.venue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Venue is required for group sessions",
        path: ["venue"],
      });
    }
    if (
      data.topic.startsWith("Bundle") &&
      data.audienceType === "Groups" &&
      data.groupSize === "5-8"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bundles require a minimum group of 9–15 participants",
        path: ["groupSize"],
      });
    }
    if (
      (data.audienceType === "Organisations & Institutions" ||
        data.audienceType === "AMCs & Wealth Firms") &&
      !data.orgName?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organisation/firm name is required",
        path: ["orgName"],
      });
    }
  });

export type SessionRequest = z.infer<typeof SessionRequestSchema>;
