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
        // v2 renamed all three and added the method row. The reference also
        // changes identity here: the page shows the Agreement number before
        // signing and the Empanelment number after, because submitting is what
        // produces the second one.
        "Empanelment Reference Number",
        "Execution Date",
        "Signature Method",
        "Status",
        "Digitally signed",
      ].some((needle) => text.includes(needle)),
  },
  {
    unit: "Deviation · agreement body superseded by the client's own contract",
    reason:
      "V7 carries a shortened on-screen summary of the agreement; the client later delivered " +
      "the contract itself as iqcommune-empanelment-agreement-content.json, whose readme says " +
      "to render it as-is. constants/agreement.ts is now generated from that file, so the page " +
      "and the signed PDF both show the client's wording and V7's summary no longer appears. " +
      "The summary is not merely shorter — it omitted the platform party, the consent sentence " +
      "and the seat of arbitration, and weakened clause 5. This range is the whole agreement " +
      "body, preamble through clause 13; the clause TITLES are unchanged and still render. " +
      "Note the page's preamble and the contract's own introParagraph are different sentences — " +
      "the page states who the Parties are, the executed document states when it takes effect — " +
      "so this range covers the page's, and constants/agreement.ts carries the document's.",
    kind: "deviation",
    // Re-measured against the v2 delivery: removing the Agreement Date and
    // Platform rows moved the whole body up by three lines.
    lines: [369, 421],
  },
  {
    unit: "State · document title",
    reason: "Set through Next's metadata export, outside the component tree this gate renders.",
    kind: "state",
    lines: [1, 8],
  },
  BRAND_TAGLINE_CASING,
];
