import { z } from "zod";

import { CITIES, INDIAN_STATES } from "@/constants/india";

/**
 * One schema, used by the modal and by the route that receives it — DoD check 6.
 *
 * Two schemas always drift, and the server's copy is the one that matters, so
 * the client imports this rather than restating the rules in JSX.
 */

export const AUDIENCES = ["individual", "corporate", "finance"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Labels are spec copy; the values are what the database stores. */
export const AUDIENCE_LABELS: Record<Audience, string> = {
  individual: "Group (register as SPOC)",
  corporate: "Organisations & Institutions",
  finance: "AMC / Wealth Firm",
};

const required = (field: string) => z.string().trim().min(1, `${field} is required`);

export const sessionRequestSchema = z.object({
  audience: z.enum(AUDIENCES, { message: "Select who this is for" }),
  firstName: required("First name").max(80),
  lastName: required("Last name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  // Deliberately permissive: Indian numbers arrive with +91, spaces and dashes,
  // and rejecting a real customer to enforce a format is the worse error.
  phone: required("Phone number").regex(/^[\d+\-()\s]{7,20}$/, "Enter a valid phone number"),
  // Client, 2026-08-19: pick-only from the 80 listed cities/every state.
  // Re-checked here, not just in the UI — a `<select>` only stops what the
  // browser renders; the API is a POST anyone can call directly.
  city: z.string().refine((value) => (CITIES as readonly string[]).includes(value), {
    message: "Select a city from the list",
  }),
  state: z.enum(INDIAN_STATES, { message: "Select a state from the list" }),
  organisationName: z.string().trim().max(160).optional(),
  topic: required("Topic of interest"),
  groupSize: z.string().trim().max(40).optional(),
  preferredWindow: z.string().trim().max(160).optional(),
  venueDetails: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  spocConfirmed: z.boolean(),
});

export type SessionRequestInput = z.infer<typeof sessionRequestSchema>;

/**
 * Groups register through a single point of contact, so the declaration is
 * mandatory for that audience and meaningless for the others.
 */
export const sessionRequestSubmission = sessionRequestSchema
  // The declaration is shown for every audience, so it is required for every
  // audience — the spec only varies its wording.
  .refine((value) => value.spocConfirmed, {
    path: ["spocConfirmed"],
    message: "Please confirm you are registering as the primary contact",
  })
  // Groups arrange their own venue, so the spec marks this field required for
  // them and hides it for everyone else.
  .refine((value) => value.audience !== "individual" || Boolean(value.venueDetails?.trim()), {
    path: ["venueDetails"],
    message: "Venue details are required for groups",
  })
  .refine(
    (value) => value.audience === "individual" || Boolean(value.organisationName?.trim()),
    { path: ["organisationName"], message: "Please tell us the organisation or firm name" },
  );
