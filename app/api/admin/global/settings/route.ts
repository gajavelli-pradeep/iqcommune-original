import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { isGalleryAdminAccessEnabled } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET — current platform settings (Global Admin only).
export async function GET() {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;
  return NextResponse.json({ galleryAdminAccess: await isGalleryAdminAccessEnabled() });
}

const Schema = z.object({ galleryAdminAccess: z.boolean() });

// PATCH — update a setting (Global Admin only, audited).
export async function PATCH(req: NextRequest) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const body = Schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Validation failed", details: body.error.flatten() }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: "gallery_admin_access", value: body.data.galleryAdminAccess }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actor = await getGlobalAdminUser();
  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "set_gallery_admin_access",
    recordTable: "app_settings",
    recordId: "gallery_admin_access",
    snapshot: { value: body.data.galleryAdminAccess },
  });

  return NextResponse.json({ galleryAdminAccess: body.data.galleryAdminAccess });
}
