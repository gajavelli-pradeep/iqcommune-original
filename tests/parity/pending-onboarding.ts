import type { PendingUnit } from "./pending";

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
  {
    unit: "Deviation · brand tagline replaced",
    reason:
      "Client copy change (2026-07-23): the header strapline reads 'Insight Quotient - " +
      "Unleashed' on every surface. See SiteHeader's default.",
    kind: "deviation",
    matches: (text) => text.includes("financial intelligence connects"),
  },
];
