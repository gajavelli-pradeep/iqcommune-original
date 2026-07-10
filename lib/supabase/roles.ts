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

// Any tier that may open a console (admin, global admin, or read-only user).
// Used by middleware + the (admin) group layout to admit users into the shell;
// finer per-console gating happens in each page.
export function hasConsoleAccess(role: unknown): boolean {
  return isAdminRole(role) || isUserRole(role);
}
