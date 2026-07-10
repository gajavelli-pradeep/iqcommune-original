import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Returns the acting global-admin's own auth id + email, so we can block
// self-demotion / self-deletion (which would risk locking the SA out).
async function actor(): Promise<{ id: string; email: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "unknown" } : null;
}

const RoleSchema = z.object({
  role: z.enum(["admin", "global_admin", "user"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;
  const me = await actor();
  if (me?.id === id) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  const body = RoleSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data: target, error: fetchErr } = await supabase.auth.admin.getUserById(id);
  if (fetchErr || !target.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await supabase.auth.admin.updateUserById(id, {
    app_metadata: { role: body.data.role },
  });
  if (error || !data.user) {
    log.error("SA role change failed", { userId: id, error: error?.message });
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  await logAdminAction({
    actorEmail: me?.email ?? "unknown",
    action: "change_admin_role",
    recordTable: "auth.users",
    recordId: id,
    snapshot: { email: target.user.email, from: target.user.app_metadata?.role, to: body.data.role },
  });

  const u = data.user;
  return NextResponse.json({
    data: {
      id: u.id,
      email: u.email,
      role: (u.app_metadata?.role as string) ?? body.data.role,
      last_sign_in_at: u.last_sign_in_at ?? null,
      created_at: u.created_at,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;
  const me = await actor();
  if (me?.id === id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: target, error: fetchErr } = await supabase.auth.admin.getUserById(id);
  if (fetchErr || !target.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    log.error("SA delete admin failed", { userId: id, error: error.message });
    return NextResponse.json({ error: "Failed to remove admin" }, { status: 500 });
  }

  await logAdminAction({
    actorEmail: me?.email ?? "unknown",
    action: "delete_admin",
    recordTable: "auth.users",
    recordId: id,
    snapshot: { email: target.user.email, role: target.user.app_metadata?.role },
  });

  return NextResponse.json({ success: true });
}
