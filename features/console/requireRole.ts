import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { ROLE_ROUTES, can, toConsoleRole, type Capability, type ConsoleRole } from "./roles";

/** Thrown when the auth check itself couldn't reach Supabase — distinct from
 *  a legitimate "no session" (which still redirects to /login). Callers use
 *  this to show a "we're reconnecting" screen instead of crashing the route. */
export class BackendUnavailableError extends Error {
  constructor(cause: unknown) {
    super("console auth check could not reach the backend");
    this.cause = cause;
  }
}

/** The one place `supabase.auth.getUser()` is called. A total outage throws
 *  there rather than resolving with `{ error }`, and an uncaught throw from a
 *  Server Component takes down the whole route — this turns that throw into
 *  a typed, catchable `BackendUnavailableError` instead of letting a network
 *  blip masquerade as an application crash. */
async function getVerifiedUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  try {
    return await supabase.auth.getUser();
  } catch (cause) {
    throw new BackendUnavailableError(cause);
  }
}

/**
 * The console's authorization boundary.
 *
 * Server-side and per route, not middleware-only: the previous system's single
 * strongest property was that every API route carried its own guard, and ADR
 * 0001 records that re-establishing it from zero is the highest risk of this
 * rebuild. A guard that lives only in middleware is one matcher typo away from
 * serving another tenant's data without raising an error.
 *
 * The role comes from `app_metadata`, which only the service role can write.
 * `user_metadata` is writable by the account it describes and must never be
 * trusted for permissions.
 */
export async function requireRole(allowed: ConsoleRole): Promise<{
  role: ConsoleRole;
  email: string;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await getVerifiedUser(supabase);

  if (error || !data.user) redirect("/login");

  const role = toConsoleRole(data.user.app_metadata?.role);
  if (!role) redirect("/login");

  // A higher role landing on a lower route is sent to its own, rather than
  // shown a downgraded console it might mistake for the whole picture.
  if (role !== allowed) redirect(ROLE_ROUTES[role]);

  return { role, email: data.user.email ?? "" };
}

/** The signed-in console session, or a redirect to /login. Role-agnostic. */
export async function getConsoleSession(): Promise<{ role: ConsoleRole; email: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await getVerifiedUser(supabase);

  if (error || !data.user) redirect("/login");
  const role = toConsoleRole(data.user.app_metadata?.role);
  if (!role) redirect("/login");

  return { role, email: data.user.email ?? "" };
}

/**
 * The authorization boundary for a mutation (audit C6). A server action must
 * re-check the capability server-side — the client controls that trigger it are
 * gated for UX, not security, and can be forged. Throws if the role lacks it.
 */
export async function requireCapability(
  capability: Capability,
): Promise<{ role: ConsoleRole; email: string }> {
  const session = await getConsoleSession();
  if (!can(session.role, capability)) {
    throw new Error(`forbidden: role ${session.role} lacks capability ${capability}`);
  }
  return session;
}
