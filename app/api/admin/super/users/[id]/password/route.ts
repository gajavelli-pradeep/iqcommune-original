import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, getSuperAdminUser } from "@/lib/supabase/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch target user to log the action
  const { data: target, error: fetchErr } = await supabase.auth.admin.getUserById(id);
  if (fetchErr || !target.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await supabase.auth.admin.updateUserById(id, {
    password: body.data.password,
  });

  if (error) {
    log.error("SA password change failed", { userId: id, error: error.message });
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }

  const actor = await getSuperAdminUser();
  await logSuperAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "set_password",
    recordTable: "auth.users",
    recordId: id,
    snapshot: { email: target.user.email, role: target.user.app_metadata?.role },
  });

  return NextResponse.json({ ok: true });
}
