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
  {
    unit: "Deviation · brand tagline replaced",
    reason:
      "Client copy change (2026-07-23): the header strapline reads 'Insight Quotient - " +
      "Unleashed' on every surface. See SiteHeader's default.",
    kind: "deviation",
    matches: (text) => text.includes("financial intelligence connects"),
  },
  {
    unit: "Deviation · one capitalisation for the apply CTA",
    reason:
      "The spec labels the same control two ways — 'Apply to Join the Network' in the hero " +
      "(598) and 'Apply to join the Network' in the closing CTA (974). One button, one label: " +
      "both render the title-case version.",
    kind: "deviation",
    lines: [974, 974],
  },
  {
    unit: "Deviation · standard footer on every page",
    reason:
      "Client change (2026-07-23): both footers carry one standard pair of lines — " +
      "Privacy Policy · Terms of Use · inbox, then the copyright. The spec's per-page " +
      "wordmark line, which said 'practitioner network' here, is what 'standard' replaced.",
    kind: "deviation",
    matches: (text) => text.includes("practitioner network ·"),
  },
  {
    unit: "Deviation · single contact inbox",
    reason:
      "Client copy change (2026-07-23): every footer points at hello@iqcommune.com. The spec's " +
      "practitioners@ address is no longer used anywhere.",
    kind: "deviation",
    matches: (text) => text.includes("practitioners@iqcommune.com"),
  },
];
