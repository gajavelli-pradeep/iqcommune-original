import { z } from "zod";

export const PhotoSubmissionSchema = z.object({
  ref:               z.string().min(1, "Required"),
  sessionId:         z.string().min(1, "Required"),
  module:            z.string().min(1, "Required"),
  city:              z.string().min(1, "Required"),
  state:             z.string().min(1, "Required"),
  org:               z.string().optional(),
  participantConsent: z.literal(true, { message: "Participant consent is required" }),
  // HMAC sig and raw params from the photo link — re-verified server-side.
  linkSig:           z.string().min(1),
  linkParams:        z.object({
    ref:     z.string(),
    session: z.string(),
    module:  z.string(),
    date:    z.string(),
    city:    z.string(),
    state:   z.string(),
    name:    z.string(),
    role:    z.string(),
    org:     z.string().optional(),
  }),
  // photo files validated separately as multipart — not in this schema
});

export type PhotoSubmission = z.infer<typeof PhotoSubmissionSchema>;
