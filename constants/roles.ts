/**
 * The three console roles — the single declaration (audit C3/H6).
 *
 * Lives in `constants/` so a server module (`services/auth.ts`) can validate a
 * role without importing out of the `features/` client graph. The capability and
 * tab logic that layers on top stays in `features/console/roles.ts`, which
 * re-exports these.
 */

export const CONSOLE_ROLES = ["user", "admin", "global_admin"] as const;
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

/** Maps the role stored in `app_metadata` onto a console role; fail-closed. */
export function toConsoleRole(value: unknown): ConsoleRole | null {
  return CONSOLE_ROLES.includes(value as ConsoleRole) ? (value as ConsoleRole) : null;
}
