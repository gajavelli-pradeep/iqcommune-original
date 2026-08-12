import { BRAND_TAGLINE_CASING, type PendingUnit } from "./pending";

/** P5 declarations. */
export const PHOTOS_PENDING: PendingUnit[] = [
  BRAND_TAGLINE_CASING,
  {
    unit: "State · submission receipt",
    reason:
      "Renders only after photos are submitted, which this gate cannot do. Proven to render by " +
      "features/photos/PhotoSubmissionForm.test.tsx.",
    kind: "state",
    matches: (text) =>
      [
        "Photos received. Thank you.",
        "We'll review and process them within 30 days",
        "Submitted by",
        "Practitioner ref.",
        "Submitted at",
        "Storage expiry",
        "Status",
        "Received - pending review",
        "Photos are stored for 30 days from the submission timestamp",
      ].some((needle) => text.includes(needle)),
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
];
