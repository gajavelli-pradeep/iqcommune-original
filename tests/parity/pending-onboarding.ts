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
    unit: "Deviation · no session-details window promised during the waitlist phase",
    reason:
      "V7 tells a freshly empanelled practitioner their first session details are coming 'within " +
      "2-3 working days'. Practitioners are now being empanelled ahead of demand, so there is no " +
      "session to send and the window cannot be kept. The 2-3 day reply window is untouched " +
      "where it is still true — reviewing an application, see pending-practitioners.ts. The rest " +
      "of the sentence, and the inbox line after it, are unchanged and still declared above as " +
      "state-gated copy.",
    kind: "deviation",
    matches: (text) => text.includes("your first session details within"),
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
  BRAND_TAGLINE_CASING,
];
