import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getSuperAdminUser } from "@/lib/supabase/require-super-admin";
import { isGalleryAdminAccessEnabled } from "@/lib/settings";

// Gallery management is allowed for super admins always, and for regular admins
// only while the SA-controlled `gallery_admin_access` flag is on.
// Returns a 401/403 response on failure, or null when access is granted.
export async function requireGalleryAccess(): Promise<NextResponse | null> {
  const notAdmin = await requireAdmin();
  if (notAdmin) return notAdmin;

  if (await getSuperAdminUser()) return null; // super admin — always allowed

  if (await isGalleryAdminAccessEnabled()) return null; // flag on — admins allowed

  return NextResponse.json(
    { error: "Gallery management is disabled for admins" },
    { status: 403 }
  );
}
