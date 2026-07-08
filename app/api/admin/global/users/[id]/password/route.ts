import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { storeAdminPassword, getAdminPassword } from "@/lib/admin-password-vault";
import { log } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Reveal the current SA-set password for an account (admin or super_admin), or
// null if none stored. SA-only; each reveal is audited.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;
  const stored = await getAdminPassword(id);

  if (stored) {
    const actor = await getGlobalAdminUser();
    await logAdminAction({
      actorEmail: actor?.email ?? "unknown",
      action: "view_admin_password",
      recordTable: "auth.users",
      recordId: id,
    });
  }

  return NextResponse.json({
    data: stored
      ? { password: stored.password, set_by: stored.setBy, set_at: stored.setAt }
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
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

  const actor = await getGlobalAdminUser();
  // Store the SA-set password (encrypted) so the SA can reveal/copy it later.
  await storeAdminPassword(id, body.data.password, actor?.email ?? "unknown");

  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "set_password",
    recordTable: "auth.users",
    recordId: id,
    snapshot: { email: target.user.email, role: target.user.app_metadata?.role },
  });

  return NextResponse.json({ ok: true });
}
