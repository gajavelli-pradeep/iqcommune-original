import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Revoke a pending invite — its link stops working immediately.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Only a still-Pending invite can be revoked (atomic guard).
  const { data, error } = await supabase
    .from("admin_invites")
    .update({ status: "Revoked" })
    .eq("id", id)
    .eq("status", "Pending")
    .select("id, email")
    .maybeSingle();

  if (error) {
    log.error("Revoke admin invite failed", { error: error.message, inviteId: id });
    return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }

  const actor = await getGlobalAdminUser();
  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "revoke_admin_invite",
    recordTable: "admin_invites",
    recordId: id,
    snapshot: { email: data.email },
  });

  return new NextResponse(null, { status: 204 });
}
