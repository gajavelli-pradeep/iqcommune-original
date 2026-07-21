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
    unit: "P2 · TrustBar",
    reason: "not built — three reassurance items between hero and roles",
    kind: "pending",
    lines: [677, 694],
  },
  {
    unit: "P2 · ModulesGrid + BundleNudge",
    reason: "not built — six teaching modules and the bundling note",
    kind: "pending",
    lines: [802, 859],
  },
  {
    unit: "P2 · FitLists",
    reason: "not built — 'This works well for some people. Not for everyone.'",
    kind: "pending",
    lines: [860, 886],
  },
  {
    unit: "P2 · DisclosureCards",
    reason: "not built — the two disclosure tiers",
    kind: "pending",
    lines: [887, 950],
  },
  {
    unit: "P2 · ApplyCta + ApplyModal",
    reason: "not built — the application form and its receipt",
    kind: "pending",
    lines: [951, 1147],
  },
  {
    unit: "P2 · Faqs",
    reason: "not built — ten practitioner questions",
    kind: "pending",
    lines: [1148, 1238],
  },
  {
    unit: "Deviation · dynamic copyright year",
    reason: "SiteFooter renders the current year; the spec hardcodes 2025. Permanent.",
    kind: "deviation",
    matches: (text) => text.includes("iqcommune. All rights reserved."),
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
