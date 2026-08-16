import { z } from "zod";

/** Shared by the post-session photo modal and its route — DoD check 6. */

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
/**
 * Aggregate ceiling across all photos in one submission (audit M4). Without it
 * the anonymous (untokenised) path accepts 10 × 25 MB = 250 MB per request into
 * paid storage, rate-limited only per-IP. 60 MB comfortably fits ten typical
 * phone photos while bounding the abuse vector on a self-hosted deploy (Vercel's
 * ~4.5 MB body cap already limits it there).
 */
export const MAX_TOTAL_PHOTO_BYTES = 60 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

const sessionDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date of the session");

export const photoSubmissionSchema = z.object({
  submitterName: z.string().trim().min(1, "Your name is required").max(120),
  submitterEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
  organisationName: z.string().trim().max(160).optional(),
  // A session cannot have happened tomorrow — a typo guard on a date somebody
  // typed. See `tokenedPhotoSubmissionSchema` for why it stops there.
  sessionDate: sessionDate.refine((value) => new Date(value) <= new Date(), {
    message: "That date is in the future",
  }),
  moduleTaught: z.string().trim().min(1, "Select the module taught"),
  participantConsent: z
    .boolean()
    .refine((given) => given, { message: "Consent is required before photos can be submitted" }),
});

/**
 * The same submission, arriving through the emailed link.
 *
 * Everything but the organisation name is read off the record the token names —
 * the practitioner never sees a name, email, date or module field, let alone
 * fills one. So the future-date guard has nothing to guard: it exists to catch
 * a typo in a self-declared date, and here there is no typing.
 *
 * Left in place it did real harm. The photo guide goes out *before* the session
 * and tells the practitioner to bookmark the link, so the session's own date is
 * routinely in the future when they open it. The submission was refused with
 * "Please check the highlighted fields" — naming fields that are not on their
 * form and that they could not have got wrong.
 *
 * A form must never fail on something the person filling it cannot see or fix.
 */
export const tokenedPhotoSubmissionSchema = photoSubmissionSchema.extend({ sessionDate });

export type PhotoSubmissionInput = z.infer<typeof photoSubmissionSchema>;

/** Type and size are checked server-side too — an extension proves nothing. */
export function validatePhotos(files: File[]): string | undefined {
  if (files.length === 0) return "Add at least one photo";
  if (files.length > MAX_PHOTOS) return `Up to ${MAX_PHOTOS} photos`;
  let total = 0;
  for (const file of files) {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      return "Photos must be JPEG or PNG";
    }
    if (file.size > MAX_PHOTO_BYTES) return "Each photo must be under 25MB";
    total += file.size;
  }
  if (total > MAX_TOTAL_PHOTO_BYTES) return "Those photos are too large together — keep the total under 60MB";
  return undefined;
}
