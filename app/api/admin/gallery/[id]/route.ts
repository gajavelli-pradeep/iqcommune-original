import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAccess } from "@/lib/supabase/require-gallery-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const GALLERY_BUCKET = "gallery";
// Live (published) gallery is capped at 20 with plain FIFO — toggling a photo
// published past the cap unpublishes the oldest published photos (never deletes).
const GAL_MAX = 20;

const EditSchema = z
  .object({
    caption_top_left:     z.string().nullable(),
    caption_bottom_right: z.string().nullable(),
    published:            z.boolean(),
    sort_order:           z.number().int(),
  })
  .partial()
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EditSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const patch = parsed.data as Database["public"]["Tables"]["gallery_photos"]["Update"];
  const db = createAdminClient();
  const { data, error } = await db
    .from("gallery_photos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Enforce the FIFO cap when this PATCH published the photo: if the live gallery
  // now exceeds GAL_MAX, unpublish the oldest published rows (by created_at) until
  // exactly GAL_MAX remain. The just-published row is excluded so it survives.
  if (parsed.data.published === true && data.published) {
    const { data: olderPublished } = await db
      .from("gallery_photos")
      .select("id")
      .eq("published", true)
      .neq("id", id)
      .order("created_at", { ascending: true });
    const overflow = (olderPublished?.length ?? 0) + 1 - GAL_MAX;
    if (olderPublished && overflow > 0) {
      const evictIds = olderPublished.slice(0, overflow).map((r) => r.id);
      const { error: capErr } = await db
        .from("gallery_photos")
        .update({ published: false })
        .in("id", evictIds);
      if (capErr) log.error("Gallery FIFO cap eviction failed (PATCH)", { error: capErr.message });
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort storage cleanup — an orphaned public object is benign.
  const { error: rmErr } = await supabase.storage.from(GALLERY_BUCKET).remove([row.storage_path]);
  if (rmErr) log.error("Gallery storage cleanup failed", { error: rmErr.message, key: row.storage_path });

  return NextResponse.json({ success: true });
}
