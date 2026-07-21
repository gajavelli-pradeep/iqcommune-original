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
   * `pending` — will be built. `deviation` — deliberately never rendered as
   * written, and therefore permanent. Kept separate so the count of real
   * outstanding work is never inflated by decisions already made.
   */
  kind: "pending" | "deviation";
  matches: (text: string) => boolean;
}

const exactly = (...strings: string[]) => {
  const set = new Set(strings);
  return (text: string) => set.has(text);
};

const containing =
  (...needles: string[]) =>
  (text: string) => {
    const haystack = text.toLowerCase();
    return needles.some((needle) => haystack.includes(needle.toLowerCase()));
  };

const either =
  (...predicates: Array<(text: string) => boolean>) =>
  (text: string) =>
    predicates.some((predicate) => predicate(text));

export const LANDING_PENDING: PendingUnit[] = [
  {
    unit: "P1 · Gallery",
    reason: "not built — drives F2, the first section needing an API read",
    kind: "pending",
    matches: either(
      exactly(
        "Sessions in the room",
        "Where it actually happens.",
        "Photos from sessions conducted across India - real rooms, real conversations.",
        "Deep in a foundations session",
        "Full house for equity investing",
        "Wrapping up on a high note",
        "Building out a portfolio, live",
        "Working through a retirement plan",
        "Great question from the back row",
        "Foundations, session two",
        "Mumbai",
        "Bengaluru",
        "Pune",
        "Delhi",
        "- we feature the best ones here.",
      ),
      containing("Attended a session? Share it on social media"),
    ),
  },
  {
    unit: "P1 · RequestModal",
    reason: "not built — drives F3, the first section needing a database write",
    kind: "pending",
    matches: either(
      exactly(
        "Rohan",
        "Mehta",
        "rohan@example.com",
        "e.g. Mumbai",
        "e.g. Maharashtra",
        "e.g. July last week",
        "Close",
        "Who is this for?",
        "Group (register as SPOC)",
        "AMC / Wealth Firm",
        "First name",
        "Last name",
        "Email address",
        "Phone number",
        "City",
        "State",
        "Topic of interest",
        "Select a training topic…",
        "Not sure - help me choose",
        "Group size",
        "Select…",
        "5 - 8 people",
        "9 - 15 people",
        "16 - 25 people",
        "Your venue details",
        "Minimum attendance commitment",
        "Anything else?",
        "(optional)",
        "Send Request",
        "Request a Session",
        "Request received!",
        "I confirm I am registering as the",
        "Organisation name",
        "Preferred date window",
      ),
      containing(
        "Tell us your topic, your group, and a preferred date window",
        "Tell us a bit about what you need",
        "e.g. Society clubhouse",
        "e.g. specific focus areas",
        "e.g. HDFC Securities",
        "Bundle - ",
        "Bundled (6-hour) sessions are open to all audiences",
        "Sessions are capped at 25 participants",
        "Rough window is fine",
        "Venue booking is your group's responsibility",
        "and will coordinate internally on session logistics",
        "No spam. We'll only reach out about your session request",
        "your session request is in",
        "Select an audience type above",
      ),
    ),
  },
  {
    unit: "P1 · PostSessionModal",
    reason: "found by this gate — absent from the P1 section list, spec line 1768",
    kind: "pending",
    matches: either(
      exactly(
        "Session details",
        "Date of session",
        "Module taught",
        "Select module…",
        "(optional - for tagging)",
        "Upload photos",
        "Tap to upload photos",
        "Submit photos",
        "Photos received - thank you.",
        "Share your session photos",
        "Organisation / group name",
      ),
      containing(
        "Photos from sessions are displayed on this page",
        "We'll process and add them to the gallery within a few days",
        "Shot checklist",
        "Back of room",
        "From trainer's position",
        "Front-left corner",
        "Front-right corner",
        "Candid - ",
        "Group photo - trainer and all participants",
        "JPEG or PNG",
        "All participants were informed that photos would be taken",
      ),
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
];
