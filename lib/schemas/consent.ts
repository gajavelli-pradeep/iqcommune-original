import { z } from "zod";

/** Admin: generate a confirmation for a session (gross + rates → net). */
export const DURATION_OPTIONS = ["3 hours", "6 hours"] as const;

export const GenerateConsentSchema = z.object({
  sessionId: z.string().uuid(),
  gross: z.number().int().positive().max(100_000_000),
  tdsRate: z.number().min(0).max(100),
  gstRate: z.number().min(0).max(100),
  // V4 §Session Consent: admin captures the start time + duration here (the Assign
  // step leaves them blank), so the confirmation/PDF carry a real session time.
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time is required"), // 24h HH:MM
  duration: z.enum(DURATION_OPTIONS),
});
export type GenerateConsentInput = z.infer<typeof GenerateConsentSchema>;

/** Public: practitioner submits consent from the signed link. */
export const ConsentSubmitSchema = z.object({
  ref: z.string().min(1).max(64),
  token: z.string().min(1).max(128),
  signatureMethod: z.enum(["drawn", "typed"]),
  signatureData: z.string().min(1).max(200_000),
});
export type ConsentSubmitInput = z.infer<typeof ConsentSubmitSchema>;
