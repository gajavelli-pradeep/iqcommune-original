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
 * `mutate`, `role-team` → `manageTeam`, `role-override` → `override`, and the
 * activity nav item → `viewActivity`.
 */

export const CONSOLE_ROLES = ["user", "admin", "global_admin"] as const;
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

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
  admin: ["mutate", "override"],
  global_admin: ["mutate", "override", "manageTeam", "viewActivity", "purge"],
};

export function can(role: ConsoleRole, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

export interface ConsoleTab {
  id: string;
  label: string;
  section: string;
  /** Omitted when every role may open it. */
  requires?: Capability;
}

/** Sidebar order and grouping, from the spec's `sb-sec` / `sb-item` blocks. */
export const CONSOLE_TABS: readonly ConsoleTab[] = [
  { id: "practitioners", label: "Practitioners", section: "Practitioner Management" },
  { id: "agreements", label: "Agreements", section: "Practitioner Management" },
  { id: "requests", label: "Session Requests", section: "Session Pipeline" },
  { id: "confirmations", label: "Session Consent", section: "Session Pipeline" },
  { id: "sessions", label: "Session Details", section: "Session Pipeline" },
  { id: "photos", label: "Photos", section: "Session Pipeline" },
  { id: "payouts", label: "Payouts", section: "Finance" },
  { id: "gallery", label: "Gallery", section: "System" },
  { id: "settings", label: "Settings", section: "System" },
  { id: "activity", label: "Activity", section: "System", requires: "viewActivity" },
];

export function tabsFor(role: ConsoleRole): readonly ConsoleTab[] {
  return CONSOLE_TABS.filter((tab) => !tab.requires || can(role, tab.requires));
}

/** Maps the role stored in `app_metadata` onto a console role. */
export function toConsoleRole(value: unknown): ConsoleRole | null {
  return CONSOLE_ROLES.includes(value as ConsoleRole) ? (value as ConsoleRole) : null;
}
