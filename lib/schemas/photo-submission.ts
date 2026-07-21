import { z } from "zod";

/** Shared by the post-session photo modal and its route — DoD check 6. */

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export const photoSubmissionSchema = z.object({
  submitterName: z.string().trim().min(1, "Your name is required").max(120),
  submitterEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  organisationName: z.string().trim().max(160).optional(),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date of the session")
    // A session cannot have happened tomorrow.
    .refine((value) => new Date(value) <= new Date(), { message: "That date is in the future" }),
  moduleTaught: z.string().trim().min(1, "Select the module taught"),
  participantConsent: z
    .boolean()
    .refine((given) => given, { message: "Consent is required before photos can be submitted" }),
});

export type PhotoSubmissionInput = z.infer<typeof photoSubmissionSchema>;

/** Type and size are checked server-side too — an extension proves nothing. */
export function validatePhotos(files: File[]): string | undefined {
  if (files.length === 0) return "Add at least one photo";
  if (files.length > MAX_PHOTOS) return `Up to ${MAX_PHOTOS} photos`;
  for (const file of files) {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      return "Photos must be JPEG or PNG";
    }
    if (file.size > MAX_PHOTO_BYTES) return "Each photo must be under 25MB";
  }
  return undefined;
}
