import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GLOBAL_ADMIN_ROLE, isGlobalAdminRole } from "@/lib/supabase/roles";

// Warn once at module load if ADMIN_EMAIL is active in production.
// It grants admin access by email address alone and bypasses the proper
// app_metadata.role check — acceptable only for dev or initial bootstrap.
if (process.env.ADMIN_EMAIL && process.env.NODE_ENV === "production") {
  console.warn(
    "[require-admin] ADMIN_EMAIL is set in a production environment. " +
    "This grants admin access to any authenticated account with this email address. " +
    "Grant access via app_metadata.role = 'admin' in Supabase Auth instead, then unset ADMIN_EMAIL."
  );
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Primary check: app_metadata.role is set by the service role only (not user-modifiable).
  // Fallback: ADMIN_EMAIL env var — dev/bootstrap convenience only. Uses case-insensitive
  // comparison since email is case-insensitive by spec. Do not rely on this in production;
  // set app_metadata.role = 'admin' via Supabase dashboard instead.
  const role = user.app_metadata?.role;
  const isAdmin =
    role === "admin" ||
    isGlobalAdminRole(role) ||
    (!!process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// Attribution helper for the activity log — returns the authenticated admin's
// email and role, or null when not an admin. `role` is 'global_admin' when the
// account carries that metadata (legacy 'super_admin' counts too), otherwise
// 'admin' (covers the ADMIN_EMAIL bootstrap fallback, treated as a plain admin).
export async function getAdminUser(): Promise<{ email: string; role: "admin" | "global_admin" } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const metaRole = user.app_metadata?.role;
  const isBootstrap =
    !!process.env.ADMIN_EMAIL &&
    user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  if (metaRole !== "admin" && !isGlobalAdminRole(metaRole) && !isBootstrap) return null;

  return {
    email: user.email ?? "unknown",
    role: isGlobalAdminRole(metaRole) ? GLOBAL_ADMIN_ROLE : "admin",
  };
}
