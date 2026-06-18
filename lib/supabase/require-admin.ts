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

  // Primary check: app_metadata.role is set by the service role only (not user-modifiable).
  // Fallback: ADMIN_EMAIL env var — dev/bootstrap convenience only. Uses case-insensitive
  // comparison since email is case-insensitive by spec. Do not rely on this in production;
  // set app_metadata.role = 'admin' via Supabase dashboard instead.
  const isAdmin =
    user.app_metadata?.role === "admin" ||
    (!!process.env.ADMIN_EMAIL &&
      user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
