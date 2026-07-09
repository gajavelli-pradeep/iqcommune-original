import { z } from "zod";

export const MODULES = [
  "Foundations of Personal Finance",
  "Retirement & Goal-Based Financial Planning",
  "Equity Investing Simplified",
  "Debt & Fixed Income Investing",
  "Asset Allocation & Portfolio Construction",
  "Investment Solutions & Portfolio Strategies",
] as const;

export const EXPERIENCE_OPTIONS = [
  "5 – 8 years",
  "9 – 12 years",
  "13 – 18 years",
  "18+ years",
] as const;

export const TEACH_FREQ_OPTIONS = [
  "Once a month",
  "Once in 2 months",
  "Once a quarter",
  "Flexible — depends on my schedule",
] as const;

export const ApplicationSchema = z
  .object({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email"),
    phone: z.string().min(6, "Required"),
    role: z.string().min(1, "Required"),
    // Optional: the disclosure/consent copy promises to share the practitioner's
    // organisation or practice name with the session organiser, so the form must
    // collect it. Blank = independent practitioner.
    organisation: z.string().optional(),
    experience: z.enum(EXPERIENCE_OPTIONS, { message: "Select experience range" }),
    city:    z.string().min(1, "Required"),
    state:   z.string().min(1, "Required"),
    modules: z.array(z.enum(MODULES)).min(1, "Select at least one module"),
    teachFreq: z.enum(TEACH_FREQ_OPTIONS, { message: "Select availability" }),
    why: z.string().min(10, "Please write at least a sentence"),
    consentOperational: z.literal(true, { message: "Required" }),
    consentNosell: z.literal(true, { message: "Required" }),
    consentEmployer: z.literal(true, { message: "Required" }),
    // payment — require either UPI or full bank details (Gap 44)
    upiId: z.string().optional(),
    bankAccountName: z.string().optional(),
    bankAccount: z.string().optional(),
    ifsc: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC")
      .optional()
      .or(z.literal("")),
    payToFamily: z.boolean().default(false),
    familyName: z.string().optional(),
    familyRelation: z.string().optional(),
    familyUpi: z.string().optional(),
    familyAccountName: z.string().optional(),
    familyBankAccount: z.string().optional(),
    familyIfsc: z.string().optional(),
    consentBilling: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Gap 44: require UPI or full bank details (name + account + IFSC)
    const hasUpi = typeof data.upiId === "string" && data.upiId.trim().length > 0;
    const hasBank =
      typeof data.bankAccountName === "string" &&
      data.bankAccountName.trim().length > 0 &&
      typeof data.bankAccount === "string" &&
      data.bankAccount.trim().length > 0 &&
      typeof data.ifsc === "string" &&
      data.ifsc.trim().length > 0;
    if (!hasUpi && !hasBank) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Please provide either your UPI ID or full bank account details for payment.",
        path: ["upiId"],
      });
    }
  });

export type Application = z.infer<typeof ApplicationSchema>;
