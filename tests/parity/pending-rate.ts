import type { PendingUnit } from "./pending";

/** P3 declarations. Ranges are lines in `iqcommune-practitioner-rating.html`. */
export const RATE_PENDING: PendingUnit[] = [
  {
    unit: "State · rating receipt",
    reason:
      "Renders only after a rating is submitted, which this gate cannot do. Proven to render by " +
      "features/rate/RateForm.test.tsx.",
    kind: "state",
    matches: (text) =>
      [
        "Thank you for your feedback",
        "We've recorded your rating",
        "Submitted at",
        "Your rating",
        "If you'd like to share more",
      ].some(
        (needle) => text.includes(needle),
      ),
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
];
