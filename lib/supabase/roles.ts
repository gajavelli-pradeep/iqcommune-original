// Global Admin is the top role. Legacy accounts may still carry the old
// "super_admin" value in app_metadata.role until they are migrated, so every
// role check accepts BOTH values — no account is locked out during the rename.
// New writes always use GLOBAL_ADMIN_ROLE.
export const GLOBAL_ADMIN_ROLE = "global_admin";
export const ADMIN_ROLE = "admin";
// User is the read-only console tier: view all data + download/export, no writes.
// It is NOT an admin — isAdminRole() intentionally excludes it, so every
// requireAdmin/requireGlobalAdmin API stays 403 for a user (mutation safety).
export const USER_ROLE = "user";
const LEGACY_GLOBAL_ADMIN_ROLE = "super_admin";

export function isGlobalAdminRole(role: unknown): boolean {
  return role === GLOBAL_ADMIN_ROLE || role === LEGACY_GLOBAL_ADMIN_ROLE;
}

export function isAdminRole(role: unknown): boolean {
  return role === ADMIN_ROLE || isGlobalAdminRole(role);
}

export function isUserRole(role: unknown): boolean {
  return role === USER_ROLE;
}

// Human labels for the three tiers — one source of truth, so an invite email, the
// console lists, and the acceptance page can never disagree about what a role is
// called. (They did: the accept page hard-coded "Admin" and told every invitee they
// were an admin, whatever role they were actually being granted.)
const ROLE_LABEL: Record<string, string> = {
  [USER_ROLE]: "User",
  [ADMIN_ROLE]: "Admin",
  [GLOBAL_ADMIN_ROLE]: "Global Admin",
  [LEGACY_GLOBAL_ADMIN_ROLE]: "Global Admin",
};

/**
 * Display name for a role. Unknown/missing falls back to "Admin" deliberately: it
 * mirrors the clamp in api/onboarding/admin-accept, which provisions 'admin' for
 * any role it doesn't recognise. The label must describe what the invitee will
 * actually get, so these two rules have to move together.
 */
export function roleLabel(role: unknown): string {
  return (typeof role === "string" ? ROLE_LABEL[role] : undefined) ?? ROLE_LABEL[ADMIN_ROLE];
}

// Any tier that may open a console (admin, global admin, or read-only user).
// Used by middleware + the (admin) group layout to admit users into the shell;
// finer per-console gating happens in each page.
export function hasConsoleAccess(role: unknown): boolean {
  return isAdminRole(role) || isUserRole(role);
}
