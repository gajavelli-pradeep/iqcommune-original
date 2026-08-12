import { BRAND_TAGLINE_CASING, dynamicCopyrightYear, type PendingUnit } from "./pending";

/**
 * P2 is mid-clone. Each entry names the *region of the spec* it owns rather
 * than a list of keywords — a range cannot quietly go stale, and it makes the
 * remaining work legible as a line count instead of guesswork.
 *
 * Ranges are lines in `iqcommune-empanelment.html`. Built already, and so
 * absent from this list: hero 581-676, who 695-741, process 742-773,
 * division-of-work 774-801, footer 1239+.
 */
export const PRACTITIONERS_PENDING: PendingUnit[] = [
  ...dynamicCopyrightYear(),
  {
    unit: "State · application receipt",
    reason:
      "Renders only after a valid submission, which this gate cannot perform. Proven to render " +
      "by features/practitioners/ApplyModal.test.tsx.",
    kind: "state",
    matches: (text) =>
      text.includes("Application received!") || text.includes("Thanks for applying"),
  },
  {
    unit: "State · document title",
    reason:
      "Set through Next's metadata export, which never enters the component tree this gate " +
      "renders.",
    kind: "state",
    lines: [6, 6],
  },
  BRAND_TAGLINE_CASING,
  {
    unit: "Deviation · one capitalisation for the apply CTA",
    reason:
      "The spec labels the same control two ways — 'Apply to Join the Network' in the hero and " +
      "'Apply to join the Network' in the closing CTA. One button, one label: both render the " +
      "title-case version. Matched on the text rather than the line, which the 2026-08-12 " +
      "delivery shifted when it added the header logo.",
    kind: "deviation",
    matches: (text) => text.includes("Apply to join the Network"),
  },
];
