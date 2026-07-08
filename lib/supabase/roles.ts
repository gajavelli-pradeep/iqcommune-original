// Global Admin is the top role. Legacy accounts may still carry the old
// "super_admin" value in app_metadata.role until they are migrated, so every
// role check accepts BOTH values — no account is locked out during the rename.
// New writes always use GLOBAL_ADMIN_ROLE.
export const GLOBAL_ADMIN_ROLE = "global_admin";
export const ADMIN_ROLE = "admin";
const LEGACY_GLOBAL_ADMIN_ROLE = "super_admin";

export function isGlobalAdminRole(role: unknown): boolean {
  return role === GLOBAL_ADMIN_ROLE || role === LEGACY_GLOBAL_ADMIN_ROLE;
}

export function isAdminRole(role: unknown): boolean {
  return role === ADMIN_ROLE || isGlobalAdminRole(role);
}
