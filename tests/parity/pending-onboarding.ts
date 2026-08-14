import { BRAND_TAGLINE_CASING, type PendingUnit } from "./pending";

/** P6 declarations. */
export const ONBOARDING_PENDING: PendingUnit[] = [
  {
    unit: "State · signed receipt and typed-signature mode",
    reason:
      "Renders only after the agreement is signed, which this gate cannot do. Proven to render " +
      "by features/onboarding/OnboardingForm.test.tsx.",
    kind: "state",
    matches: (text) =>
      [
        "Agreement signed. Welcome to iqcommune.",
        // The success lede. It used to be declared separately as a deviation,
        // because the page dropped V7's "within 2-3 working days" promise on
        // wording chosen here. The 2026-08-14 delivery replaced that sentence
        // with the client's own, which this page now renders verbatim — so the
        // only reason it is still missing from this gate is the one every other
        // needle here has: it lives behind a signature.
        "Your empanelment is confirmed",
        "your inbox",
        "Signed by",
        "Type your name to generate signature",
        "Agreement ref.",
        "Timestamp",
        "Status",
        "Digitally signed",
      ].some((needle) => text.includes(needle)),
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
  BRAND_TAGLINE_CASING,
];
