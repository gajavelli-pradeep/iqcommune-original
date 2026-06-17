import { z } from "zod";
import { MODULES } from "./application";

export const AUDIENCE_OPTIONS = [
  "Groups",
  "Organisations & Institutions",
  "AMCs & Wealth Firms",
] as const;

export const GROUP_SIZE_OPTIONS = ["5–8", "9–15", "16–20"] as const;

export const SessionRequestSchema = z.object({
  name: z.string().min(1, "Required"),
  org: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  topic: z.enum(MODULES, { message: "Select a topic" }),
  audienceType: z.enum(AUDIENCE_OPTIONS, { message: "Select audience type" }),
  groupSize: z.enum(GROUP_SIZE_OPTIONS, { message: "Select group size" }),
  minCommit: z.number().int().min(1, "Required"),
  venue: z.string().optional(),
  preferredDates: z.string().min(1, "Required"),
});

export type SessionRequest = z.infer<typeof SessionRequestSchema>;
