import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function GET() {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    log.error("SA list users failed", { error: error.message });
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }

  // Return only admin/super_admin users — strip sensitive fields
  const adminUsers = (data.users ?? [])
    .filter((u) => {
      const role = u.app_metadata?.role;
      return role === "admin" || role === "super_admin";
    })
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role ?? "admin",
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at,
    }));

  return NextResponse.json({ data: adminUsers });
}
