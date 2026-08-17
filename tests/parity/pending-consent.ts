import { BRAND_TAGLINE_CASING, type PendingUnit } from "./pending";

/** P4 declarations. */
export const CONSENT_PENDING: PendingUnit[] = [
  BRAND_TAGLINE_CASING,
  {
    unit: "State · consent receipt",
    reason:
      "Renders only after consent is given, which this gate cannot do. Proven to render by " +
      "features/consent/ConsentForm.test.tsx.",
    kind: "state",
    // These needles are matched against the SPEC's text, not the app's, so they
    // stay on V7's wording. The panel now reads "confirmed from your side"
    // (client, 2026-08-17) while the spec still says "fully confirmed" — chasing
    // the app copy here would leave the spec's line unclaimed and fail the gate
    // for a change that has nothing to do with it.
    matches: (text) =>
      ["Consent recorded", "your session is now fully confirmed", "Digital consent timestamp"].some(
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
