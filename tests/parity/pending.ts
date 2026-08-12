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

/** The year hardcoded in the delivered specs' footers. */
const SPEC_COPYRIGHT_YEAR = 2026;

/**
 * SiteFooter renders the current year where the spec hardcodes one, so the two
 * agree for exactly as long as the calendar does.
 *
 * Declaring the deviation unconditionally would make it stale today (rule 2);
 * omitting it outright would fail every footer-bearing gate on 1 January with no
 * code change — a test that breaks by calendar. So it is declared only once the
 * years have actually diverged. Shared because both public pages carry the same
 * footer and would otherwise drift apart.
 */
export const dynamicCopyrightYear = (): PendingUnit[] =>
  new Date().getFullYear() === SPEC_COPYRIGHT_YEAR
    ? []
    : [
        {
          unit: "Deviation · dynamic copyright year",
          reason:
            `SiteFooter renders the current year; the spec hardcodes ${SPEC_COPYRIGHT_YEAR}, ` +
            "which would read as an abandoned site. Deliberate and permanent — see " +
            "components/layout/SiteFooter.tsx.",
          kind: "deviation",
          matches: containing(`© ${SPEC_COPYRIGHT_YEAR}. InvestQ Commune. All Rights Reserved`),
        },
      ];

/**
 * Every page's header carries the strapline from the 2026-08-12 delivery on, so
 * every gate needs this same declaration. One object rather than seven copies —
 * the reason is identical and a divergent copy would be a lie on six pages.
 */
export const BRAND_TAGLINE_CASING: PendingUnit = {
  unit: "Deviation · brand tagline cased by CSS, not authored in caps",
  reason:
    "The 2026-08-12 delivery authors the strapline as 'INSIGHT QUOTIENT - UNLEASHED' where the " +
    "CSS already applies text-transform:uppercase. SiteHeader keeps the title-case string in " +
    "the DOM and lets the same transform draw it, so the rendered header is identical — but a " +
    "literal comparison sees the casing. Title case is deliberate: several screen readers spell " +
    "all-caps text out letter by letter.",
  kind: "deviation",
  matches: containing("INSIGHT QUOTIENT - UNLEASHED"),
};

export const LANDING_PENDING: PendingUnit[] = [
  BRAND_TAGLINE_CASING,
  {
    unit: "State · submission receipts",
    reason:
      "Renders only after a successful POST, which this gate cannot perform. Proven to render " +
      "by features/landing/sections/modals.test.tsx — 'shows the receipt after a successful " +
      "submission', for both dialogs. The waitlist receipt is greeted by name there, matching " +
      "V7's own scripted version; the spec's unnamed static copy is its no-JS fallback.",
    kind: "state",
    matches: containing(
      "You're on the list!",
      "you're on the waitlist",
      "Photos received - thank you.",
      "We'll process and add them to the gallery within a few days",
    ),
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
  ...dynamicCopyrightYear(),
];
