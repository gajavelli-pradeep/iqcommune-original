import { z } from "zod";

/** Public: the requestor rates the practitioner from the signed /rate link. */
export const RatingSubmitSchema = z.object({
  ref: z.string().min(1).max(64),
  token: z.string().min(1).max(128),
  // Rating out of 5 (whole stars); comments optional (V6 practitioner-rating page).
  rating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(2000).optional(),
});
export type RatingSubmitInput = z.infer<typeof RatingSubmitSchema>;
