"use server";

import { redirect } from "next/navigation";

import { log, newTraceId } from "@/lib/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ROLE_ROUTES, toConsoleRole } from "@/features/console/roles";

export interface SignInResult {
  error?: string;
}

/**
 * Console sign-in (audit C5). The anon client signs the user in and sets the
 * session cookie through the SSR cookie adapter; a server action runs in a
 * mutation context, so `setAll` succeeds here (unlike a Server Component).
 *
 * On success the account's `app_metadata.role` decides the route — the same
 * fail-closed `toConsoleRole` the API and `requireRole` use, so an account with
 * no console role can authenticate but lands nowhere it should not.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const traceId = newTraceId();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    log.info(traceId, "console sign-in rejected", { reason: error?.message ?? "no user" });
    // Deliberately vague: never disclose whether the email exists.
    return { error: "Incorrect email or password." };
  }

  const role = toConsoleRole(data.user.app_metadata?.role);
  if (!role) {
    log.warn(traceId, "sign-in for an account with no console role", { userId: data.user.id });
    await supabase.auth.signOut();
    return { error: "This account does not have console access." };
  }

  log.info(traceId, "console sign-in", { userId: data.user.id, role });
  redirect(ROLE_ROUTES[role]);
}

/** Signs out and returns to the login screen. */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
