import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

if (process.env.SUPER_ADMIN_EMAIL && process.env.NODE_ENV === "production") {
  console.warn(
    "[require-super-admin] SUPER_ADMIN_EMAIL is set in a production environment. " +
    "Grant access via app_metadata.role = 'super_admin' in Supabase Auth instead, then unset SUPER_ADMIN_EMAIL."
  );
}

function isSuperAdminUser(user: { app_metadata?: Record<string, unknown>; email?: string }): boolean {
  return (
    user.app_metadata?.role === "super_admin" ||
    (!!process.env.SUPER_ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase())
  );
}

// For API routes — returns 401/403 response on failure, null on success.
export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden — Super Admin access required" }, { status: 403 });
  }
  return null;
}

// For server components — returns the authenticated user's email, or null.
export async function getSuperAdminUser(): Promise<{ email: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminUser(user)) return null;
  return { email: user.email ?? "" };
}
