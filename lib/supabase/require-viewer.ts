import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { hasConsoleAccess } from "@/lib/supabase/roles";

// Guard for READ / DOWNLOAD / EXPORT endpoints that the read-only User tier is
// allowed to reach (view all data + download photos/agreements). Accepts user,
// admin, and global_admin. Mutating endpoints must keep using requireAdmin /
// requireGlobalAdmin — a User must never reach those (403).
//
// The ADMIN_EMAIL bootstrap is honoured for parity with requireAdmin so a
// bootstrap admin isn't accidentally locked out of downloads.
export async function requireViewer(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = user.app_metadata?.role;
  const allowed =
    hasConsoleAccess(role) ||
    (!!process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
