import { requireSuperAdmin } from "@/lib/supabase/require-super-admin";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireSuperAdmin();
  if (deny) return deny;

  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const actorEmail = user?.email ?? "unknown";

  const db = createAdminClient();

  const { data: record } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logSuperAdminAction({
    actorEmail,
    action: "delete_session",
    recordTable: "sessions",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { error } = await db.from("sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
