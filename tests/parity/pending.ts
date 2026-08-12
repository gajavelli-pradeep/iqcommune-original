/**
 * Declared-pending copy — BUILD-PLAN.md F4.
 *
 * The parity gate must run from section 1, long before a page is finished, or
 * it never gets built at all. Every V7 string missing because its section is
 * not written yet is declared here against the unit that will deliver it.
 *
 * Two rules stop this becoming a place to hide failures:
 *
 *   1. A missing string matching no unit fails the build. Copy cannot go
 *      missing silently.
 *   2. A unit matching nothing missing also fails the build — a stale exemption
 *      is deleted the moment its section lands, not eventually.
 *
 * This list only shrinks. Empty for a route = that route's parity is complete.
 */
export interface PendingUnit {
  /** The build-plan unit that will deliver this copy, or the deviation's name. */
  unit: string;
  /** Why it is not rendered. */
  reason: string;
  /**
   * `pending`   — not built yet.
   * `deviation` — deliberately never rendered as written; permanent.
   * `state`     — shipped, but only reachable in a state this static gate
   *               cannot drive (a successful POST). Every `state` entry must
   *               name the test that proves the copy actually renders, or it is
   *               just a `pending` in disguise.
   */
  kind: "pending" | "deviation" | "state";
  /**
   * Either a predicate on the string, or the spec region that owns it. A range
   * is preferred: it cannot drift out of date the way a keyword list does.
   */
  matches?: (text: string) => boolean;
  /** Inclusive [start, end] line range in the spec file. */
  lines?: readonly [number, number];
}

/** True when this unit claims the given spec string. */
export function claims(unit: PendingUnit, text: string, line: number): boolean {
  if (unit.lines && line >= unit.lines[0] && line <= unit.lines[1]) return true;
  return unit.matches?.(text) ?? false;
}

const containing =
  (...needles: string[]) =>
  (text: string) => {
    const haystack = text.toLowerCase();
    return needles.some((needle) => haystack.includes(needle.toLowerCase()));
  };

export const LANDING_PENDING: PendingUnit[] = [
  {
    unit: "State · submission receipts",
    reason:
      "Renders only after a successful POST, which this gate cannot perform. Proven to render " +
      "by features/landing/sections/modals.test.tsx — 'shows the receipt after a successful " +
      "submission'.",
    kind: "state",
    matches: containing(
      "Photos received - thank you.",
      "We'll process and add them to the gallery within a few days",
    ),
  },
  {
    unit: "Deviation · session receipt superseded by client copy",
    reason:
      "V7's receipt promised a 2-3 working day follow-up. Sessions are not scheduled on arrival " +
      "during the opening months — practitioner empanelment is still under way — so on " +
      "2026-08-12 the client replaced this copy: the dialog and the confirmation email now " +
      "commit to mapping a practitioner in the requester's city rather than to a date. Restoring " +
      "either V7 string would re-promise a window nobody can honour. The replacement is proven " +
      "to render by features/landing/sections/modals.test.tsx — 'shows the receipt after a " +
      "successful submission'.",
    kind: "deviation",
    matches: containing("Request received!", "your session request is in"),
  },
  {
    unit: "Deviation · unreachable default declaration text",
    reason:
      "The spec's static SPOC sentence is overwritten by its own script the moment an audience " +
      "is chosen, and the declaration is hidden until one is. It is therefore copy no visitor " +
      "can ever read; the three audience-specific versions are shipped instead.",
    kind: "deviation",
    matches: containing(
      "and will coordinate internally on session logistics and participant attendance.",
    ),
  },
  {
    unit: "Deviation · dynamic copyright year",
    reason:
      "SiteFooter renders the current year; the spec's hardcoded 2025 would be wrong on 1 Jan. " +
      "Deliberate and permanent — see components/layout/SiteFooter.tsx.",
    kind: "deviation",
    matches: containing("iqcommune. All rights reserved."),
  },
  {
    unit: "Deviation · brand tagline replaced",
    reason:
      "Client copy change (2026-07-23): the header strapline and footer tagline now read " +
      "'Insight Quotient - Unleashed', decoding the brand name. Supersedes the spec's " +
      "'Where financial intelligence connects' on every surface — SiteHeader and SiteFooter " +
      "defaults, so the page title and footer sentence move with it.",
    kind: "deviation",
    matches: containing("financial intelligence connects"),
  },
];
