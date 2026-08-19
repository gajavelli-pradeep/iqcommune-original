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
    unit: "Deviation · two of the gallery's four city badges, dropped on request",
    reason:
      "The client asked for the Bengaluru and Pune badges removed from the illustrative gallery " +
      "placeholders (features/landing/sections/Gallery.tsx, slides 4 and 6) — reviewed and " +
      "confirmed the `city` field only ever drew that one badge (GalleryCarousel.tsx), nothing " +
      "else reads it. Mumbai and Delhi's spec lines (1548, 1591) still render — the badges kept " +
      "and the city-form placeholders elsewhere both still say 'Mumbai'/'Delhi' — this is only " +
      "the two whose one occurrence in the whole spec was the badge that is now gone. Matched by " +
      "exact equality, not substring: `containing` would also swallow a future, unrelated mention " +
      "of either city elsewhere on the page.",
    kind: "deviation",
    matches: (text) => text === "Bengaluru" || text === "Pune",
  },
  {
    unit: "Deviation · State is a pick-only select, not a free-text example",
    reason:
      "The client's 2026-08-19 change makes State a real <select>, restricted to every Indian " +
      "state (features/landing/sections/RequestModal.tsx, features/practitioners/" +
      "ApplyModalBody.tsx). V7's 'e.g. Maharashtra' placeholder was written for a free-text " +
      "field that no longer exists here — a select's placeholder is its empty option's label " +
      "('Select your state'), not a typed example, so the literal V7 string cannot render. " +
      "City stays a ComboField (searchable, still restricted to the 80 listed cities by the " +
      "schema) — its 'e.g. Mumbai' placeholder is unchanged and needs no declaration.",
    kind: "deviation",
    matches: containing("e.g. Maharashtra"),
  },
  {
    unit: "State · submission receipts",
    reason:
      "Renders only after a successful POST, which this gate cannot perform. Proven to render " +
      "by features/landing/sections/modals.test.tsx — 'shows the receipt after a successful " +
      "submission', for both dialogs. The waitlist receipt keeps V7's heading and replaces its " +
      "body: the client's confirmations delivery (2026-08-14) rewrote that sentence and dropped " +
      "the name V7's script greeted by, so the popup now opens the way the confirmation email " +
      "does. Both wordings live in content/session-request.ts.",
    kind: "state",
    matches: containing(
      "You're on the list!",
      "you're on the waitlist",
      "Photos received - thank you.",
      "We'll process and add them to the gallery within a few days",
    ),
  },
  {
    unit: "Deviation · how it works, reworded for the waitlist phase",
    reason:
      "The client's 2026-08-12 changelog rewrote thirteen locations away from promising a " +
      "scheduled session, listed this block under 'Flagged, But Not Changed', and left the call " +
      "open. The call: reworded, not hidden. Steps 2 and 3 were the whole of the promise — a " +
      "request that gets answered and a schedule that gets locked in — and are now the waitlist " +
      "and the city that everyone is waiting on. Steps 1 and 4 are unchanged and still render, " +
      "which is what leaves the section forward-looking rather than a description of today.",
    kind: "deviation",
    lines: [1094, 1109],
  },
  {
    unit: "Deviation · FAQ answers that promised a schedule",
    reason:
      "Four answers described active scheduling in prose. The changelog caught only the two that " +
      "named the form by its old title, because those are the two a find-and-replace on 'Request " +
      "a Session' would surface; these say the same thing without the phrase. Each keeps its " +
      "answer and loses only the scheduling clause.",
    kind: "deviation",
    matches: containing(
      // FAQ 1 — asks for a date window, then promises to confirm the schedule.
      "a preferred date window, and your venue details",
      // FAQ 5 — "we build the session schedule around it".
      "we build the session schedule around it",
      // FAQ 6 — "around your schedule".
      "align the right practitioner around your schedule",
      // FAQ 8 — "before we confirm your session details".
      "before we confirm your session details",
    ),
  },
  {
    unit: "Deviation · the dialog's submit button names the action it completes",
    reason:
      "V7 labels it 'Send Request'. The changelog renamed this dialog's title, subtitle, fine " +
      "print and receipt to the waitlist and stopped there, so the one control that actually " +
      "submits the form still sent a request — the last place on the page where the old model " +
      "survived, and the most consequential, being the control the visitor presses. It now " +
      "carries the same phrase as every CTA that opens the dialog. The button-contract gate " +
      "still counts three of those on the closed page; this fourth exists only while the dialog " +
      "is open.",
    kind: "deviation",
    lines: [1752, 1752],
  },
  {
    unit: "Deviation · preferred-window field carries no scheduling promise",
    reason:
      "V7 labels this 'Preferred date window' and hints 'we confirm offline' — the last control " +
      "still asking for the thing the page stopped promising, and it sits directly under a CTA " +
      "the same changelog rewrote to ask only for a topic and a group. The field itself stays: " +
      "it is optional, and a rough window is the signal that decides which city gets empanelled " +
      "first. Its placeholder is unchanged and still renders; only the label and the hint move.",
    kind: "deviation",
    lines: [1715, 1717],
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
