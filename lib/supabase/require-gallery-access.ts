import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

// Gallery management is allowed for global admins always, and for a regular admin
// only when the Global Admin has granted that specific account gallery access
// (`app_metadata.gallery_access === true`). This is per-admin, not global.
// Returns a 401/403 response on failure, or null when access is granted.
export async function requireGalleryAccess(): Promise<NextResponse | null> {
  const notAdmin = await requireAdmin();
  if (notAdmin) return notAdmin;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (isGlobalAdminRole(user?.app_metadata?.role)) return null; // Global Admin — always allowed
  if (user?.app_metadata?.gallery_access === true) return null; // granted this admin

  return NextResponse.json(
    { error: "Gallery management is not enabled for your account" },
    { status: 403 }
  );
}
