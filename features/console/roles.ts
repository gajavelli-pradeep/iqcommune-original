/**
 * One console, three routes.
 *
 * The client's mockup is a single file with a demo `<select>` that swaps a
 * `role-*` class on `<body>` and lets CSS hide controls. The real product has
 * three routes — `/user`, `/console`, `/globaladmin` — and the difference
 * between them is *which controls exist*, not which are painted over.
 *
 * That distinction is the whole reason this file exists. A hidden button is
 * still in the DOM, still focusable, and still wired; role-based access that
 * lives in CSS is a suggestion. Here a capability the role does not hold means
 * the control is never rendered, and the route that serves it re-checks the
 * role server-side.
 *
 * The spec's own class names map onto these capabilities: `role-edit` →
 * `mutate`, `role-team` → `manageTeam`, `role-override` → `override`, and
 * `role-activity-nav` → `viewActivity`.
 *
 * Read the CSS, not the class names, when deciding who holds what. The rules at
 * lines 49-56 hide `role-override` from `body.role-admin` as well as from
 * `body.role-user`, so overriding an automated field is Global Admin only —
 * the same tier as team management, not the same tier as editing. Grouping it
 * with `mutate` because both look like "editing" would hand every admin the
 * ability to overwrite a system-derived value.
 */

import type { ConsoleRole } from "@/constants/roles";

// Re-exported so existing call sites keep importing the role primitives from
// here; the single declaration now lives in constants/ (audit H6).
export { CONSOLE_ROLES, toConsoleRole } from "@/constants/roles";
export type { ConsoleRole };

/** The route each role signs in to. */
export const ROLE_ROUTES: Record<ConsoleRole, string> = {
  user: "/user",
  admin: "/console",
  global_admin: "/globaladmin",
};

export const ROLE_LABELS: Record<ConsoleRole, string> = {
  user: "User — view & download only",
  admin: "Admin — full access except managing team members",
  global_admin: "Global Admin — full access, can manage team",
};

export type Capability =
  /** Create, edit and progress records. The spec's `role-edit`. */
  | "mutate"
  /** Invite and manage console users. The spec's `role-team`. */
  | "manageTeam"
  /** Override an automated decision. The spec's `role-override`. */
  | "override"
  /** Read the audit trail. */
  | "viewActivity"
  /** Permanently remove a soft-deleted record. */
  | "purge";

const CAPABILITIES: Record<ConsoleRole, readonly Capability[]> = {
  // Deliberately empty of write capabilities: "view & download only" is the
  // spec's own description, and a read-only role that can mutate anything is
  // not read-only.
  user: [],
  admin: ["mutate"],
  global_admin: ["mutate", "override", "manageTeam", "viewActivity", "purge"],
};

export function can(role: ConsoleRole, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

export interface ConsoleTab {
  id: string;
  /** Sidebar label (V7 `.sb-item`). */
  label: string;
  /** Panel page heading (V7 `.page-hdr h1`) — differs from the sidebar label
   *  on some tabs (e.g. "Practitioners" → "Practitioner pipeline"). */
  title: string;
  /** Panel page subtitle (V7 `.page-hdr p`). */
  subtitle: string;
  section: string;
  /** Omitted when every role may open it. */
  requires?: Capability;
}

/** Sidebar order and grouping, from the spec's `sb-sec` / `sb-item` blocks;
 *  page title + subtitle from the spec's `.page-hdr`. */
export const CONSOLE_TABS: readonly ConsoleTab[] = [
  {
    id: "practitioners",
    label: "Practitioners",
    title: "Practitioner pipeline",
    subtitle: "Manage applications, onboarding, and empanelment",
    section: "Practitioner Management",
  },
  {
    id: "agreements",
    label: "Agreements",
    title: "Agreements",
    subtitle:
      "Practitioners appear here automatically once marked Empanelled — signed date, method, and status are all captured automatically the moment they sign online",
    section: "Practitioner Management",
  },
  {
    id: "requests",
    label: "Session Requests",
    title: "Session Requests",
    subtitle: "Incoming requests from iqcommune.com — assign a practitioner to confirm",
    section: "Session Pipeline",
  },
  {
    id: "confirmations",
    label: "Session Consent",
    title: "Session Consent",
    subtitle:
      "The critical junction of the whole loop — generate consent, track it, then send the photo guide once confirmed.",
    section: "Session Pipeline",
  },
  {
    id: "sessions",
    label: "Session Details",
    title: "Session Details",
    subtitle:
      "An overall dashboard — delivery status, payout figures, and post-session rating for every session",
    section: "Session Pipeline",
  },
  {
    id: "photos",
    label: "Photos",
    title: "Session Photos",
    subtitle:
      "Every completed session appears here — photos land automatically if the practitioner uses the link, or upload them yourself if they send them another way.",
    section: "Session Pipeline",
  },
  {
    id: "payouts",
    label: "Payouts",
    title: "Payouts",
    subtitle:
      "Track practitioner payments per session — Gross and Net pull from the session's consent record; mark Paid once the bank transfer is done.",
    section: "Finance",
  },
  {
    id: "gallery",
    label: "Gallery",
    title: "Gallery",
    subtitle:
      "Curate photos for “Sessions in the room” on the main landing page. Standalone — not linked to practitioners, sessions, or requests.",
    section: "System",
  },
  {
    id: "settings",
    label: "Settings",
    title: "Settings",
    subtitle: "Manage team access and review platform-wide permissions.",
    section: "System",
  },
  {
    id: "activity",
    label: "Activity",
    title: "Activity",
    subtitle: "A running log of actions taken across the console — visible to Global Admins only.",
    section: "System",
    requires: "viewActivity",
  },
];

export function tabsFor(role: ConsoleRole): readonly ConsoleTab[] {
  return CONSOLE_TABS.filter((tab) => !tab.requires || can(role, tab.requires));
}
