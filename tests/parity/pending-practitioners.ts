import type { PendingUnit } from "./pending";

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
  {
    unit: "Deviation · dynamic copyright year",
    reason: "SiteFooter renders the current year; the spec hardcodes 2025. Permanent.",
    kind: "deviation",
    matches: (text) => text.includes("iqcommune. All rights reserved."),
  },
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
];
