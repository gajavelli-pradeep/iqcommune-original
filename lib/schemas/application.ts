import { z } from "zod";

export const MODULES = [
  "Financial Planning Basics",
  "Investment Basics",
  "Market Fundamentals",
  "Stock Market Basics",
  "Retirement Planning",
  "Goal-Based Investing",
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

export const ApplicationSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6, "Required"),
  role: z.string().min(1, "Required"),
  org: z.string().optional(),
  experience: z.enum(EXPERIENCE_OPTIONS, { message: "Select experience range" }),
  city: z.string().min(1, "Required"),
  modules: z.array(z.enum(MODULES)).min(1, "Select at least one module"),
  teachFreq: z.enum(TEACH_FREQ_OPTIONS, { message: "Select availability" }),
  why: z.string().min(10, "Please write at least a sentence"),
  consentOperational: z.literal(true, { message: "Required" }),
  consentNosell: z.literal(true, { message: "Required" }),
  consentEmployer: z.literal(true, { message: "Required" }),
  // payment — optional at application stage
  upiId: z.string().optional(),
  bankName: z.string().optional(),
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
  familyBank: z.string().optional(),
  familyIfsc: z.string().optional(),
});

export type Application = z.infer<typeof ApplicationSchema>;
