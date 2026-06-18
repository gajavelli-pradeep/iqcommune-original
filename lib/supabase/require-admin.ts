import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Support both Supabase app_metadata role claim and ADMIN_EMAIL env var.
  // Set app_metadata.role = 'admin' via Supabase dashboard for production.
  const isAdmin =
    user.app_metadata?.role === "admin" ||
    (!!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
