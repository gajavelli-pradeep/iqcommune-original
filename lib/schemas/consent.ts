import { z } from "zod";

/** Admin: generate a confirmation for a session (gross + rates → net). */
export const DURATION_OPTIONS = ["3 hours", "6 hours"] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

export const GenerateConsentSchema = z.object({
  sessionId: z.string().uuid(),
  gross: z.number().int().positive().max(100_000_000),
  tdsRate: z.number().min(0).max(100),
  gstRate: z.number().min(0).max(100),
  // V4 §Session Consent: admin captures the start time + duration here (the Assign
  // step leaves them blank), so the confirmation/PDF carry a real session time.
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time is required"), // 24h HH:MM
  duration: z.enum(DURATION_OPTIONS),
  // V6 §3: when false, generate the confirmation + link WITHOUT emailing, so the
  // client can show an editable send-preview and email it (with a 15s undo) itself.
  sendEmail: z.boolean().default(true),
});
export type GenerateConsentInput = z.infer<typeof GenerateConsentSchema>;

/**
 * Global Admin: replace the practitioner on an Upcoming session. Supersedes the
 * active confirmation and re-drives consent for the new practitioner, so it carries
 * the same money/time fields as a fresh generate plus the new practitioner + a reason.
 */
export const ReassignConsentSchema = z.object({
  newPractitionerId: z.string().uuid(),
  reason: z.string().trim().min(3, "A reason is required").max(500),
  gross: z.number().int().positive().max(100_000_000),
  tdsRate: z.number().min(0).max(100),
  gstRate: z.number().min(0).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time is required"), // 24h HH:MM
  duration: z.enum(DURATION_OPTIONS),
});
export type ReassignConsentInput = z.infer<typeof ReassignConsentSchema>;

/** Public: practitioner submits consent from the signed link. */
export const ConsentSubmitSchema = z.object({
  ref: z.string().min(1).max(64),
  token: z.string().min(1).max(128),
  signatureMethod: z.enum(["drawn", "typed"]),
  signatureData: z.string().min(1).max(200_000),
});
export type ConsentSubmitInput = z.infer<typeof ConsentSubmitSchema>;
