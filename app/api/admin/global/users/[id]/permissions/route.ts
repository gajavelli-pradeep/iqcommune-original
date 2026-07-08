import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Grant / revoke a specific admin's gallery-management access (per-admin, not global).
// Merges into app_metadata so the account's role is preserved.
const Body = z.object({
  galleryAccess: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "galleryAccess (boolean) is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: target, error: fetchErr } = await supabase.auth.admin.getUserById(id);
  if (fetchErr || !target.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await supabase.auth.admin.updateUserById(id, {
    // Preserve existing metadata (role etc.) — only flip gallery_access.
    app_metadata: { ...target.user.app_metadata, gallery_access: body.data.galleryAccess },
  });
  if (error || !data.user) {
    log.error("SA set gallery access failed", { userId: id, error: error?.message });
    return NextResponse.json({ error: "Failed to update access" }, { status: 500 });
  }

  const actor = await getGlobalAdminUser();
  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: body.data.galleryAccess ? "grant_gallery_access" : "revoke_gallery_access",
    recordTable: "auth.users",
    recordId: id,
    snapshot: { email: target.user.email, gallery_access: body.data.galleryAccess },
  });

  return NextResponse.json({ data: { id, gallery_access: body.data.galleryAccess } });
}
