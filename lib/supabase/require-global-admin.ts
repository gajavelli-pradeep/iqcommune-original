import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

// Bootstrap-only email override. Accepts the new GLOBAL_ADMIN_EMAIL and, for
// continuity, the legacy SUPER_ADMIN_EMAIL.
const bootstrapEmail =
  process.env.GLOBAL_ADMIN_EMAIL ?? process.env.SUPER_ADMIN_EMAIL;

if (bootstrapEmail && process.env.NODE_ENV === "production") {
  console.warn(
    "[require-global-admin] A Global-Admin bootstrap email is set in production. " +
    "Grant access via app_metadata.role = 'global_admin' in Supabase Auth instead."
  );
}

function isGlobalAdminUser(user: { app_metadata?: Record<string, unknown>; email?: string }): boolean {
  return (
    isGlobalAdminRole(user.app_metadata?.role) ||
    (!!bootstrapEmail && user.email?.toLowerCase() === bootstrapEmail.toLowerCase())
  );
}

// For API routes — returns 401/403 response on failure, null on success.
export async function requireGlobalAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isGlobalAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden — Global Admin access required" }, { status: 403 });
  }
  return null;
}

// For server components — returns the authenticated user's email, or null.
export async function getGlobalAdminUser(): Promise<{ email: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isGlobalAdminUser(user)) return null;
  return { email: user.email ?? "" };
}
