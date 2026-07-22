import { z } from "zod";

import { MODULES } from "@/constants/modules";

/** Practitioner empanelment application — shared by the modal and its route. */

// Re-exported so existing call sites keep importing MODULES from here; the
// single declaration now lives in constants/ (audit M4).
export { MODULES };

export const EXPERIENCE_BANDS = ["5 – 8 years", "9 – 12 years", "13 – 18 years", "18+ years"] as const;
export const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
export const TEACHING_FREQUENCIES = [
  "Once a month",
  "Once in 2 months",
  "Once a quarter",
  "Flexible — depends on my schedule",
] as const;

const required = (field: string) => z.string().trim().min(1, `${field} is required`);

export const applicationSchema = z.object({
  firstName: required("First name").max(80),
  lastName: required("Last name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: required("Phone number").regex(/^[\d+\-()\s]{7,20}$/, "Enter a valid phone number"),
  jobTitle: required("Current job title").max(120),
  experience: z.enum(EXPERIENCE_BANDS, { message: "Select your years of experience" }),
  city: required("City").max(80),
  state: required("State").max(80),
  address: required("Communication address").max(400),
  tshirtSize: z.enum(TSHIRT_SIZES, { message: "Select a t-shirt size" }),
  modules: z.array(z.enum(MODULES)).min(1, "Choose at least one module"),
  frequency: z.enum(TEACHING_FREQUENCIES, { message: "Tell us how often you could teach" }),
  motivation: required("A short note").max(1500),

  // Three separate acknowledgements, not one blanket tick. They cover different
  // commitments and the spec requires each to be given on its own.
  consentDisclosure: z.literal(true, { message: "Please confirm the disclosure terms" }),
  consentNoCrossSell: z.literal(true, { message: "Please confirm the no-cross-selling term" }),
  consentEmployer: z.literal(true, { message: "Please confirm the employer-disclosure term" }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
