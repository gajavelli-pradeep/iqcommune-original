import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAccess } from "@/lib/supabase/require-gallery-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SESSION_BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";
const GALLERY_BUCKET = "gallery";

// POST — "Feature in gallery": copy this submission's photos from the private
// session-photos bucket into the public gallery bucket and add gallery_photos
// rows (tagged with source_submission_id so the toggle can undo it). Idempotent:
// if the set is already featured, returns without duplicating.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  const { id } = await params;
  const db = createAdminClient();

  const { data: sub, error } = await db
    .from("photo_submissions")
    .select("id, storage_keys, module, city")
    .eq("id", id)
    .single();
  if (error || !sub) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  const { data: existing } = await db
    .from("gallery_photos")
    .select("id")
    .eq("source_submission_id", id)
    .limit(1);
  if (existing && existing.length) {
    return NextResponse.json({ data: { featured: true, alreadyFeatured: true } });
  }

  const keys = (sub.storage_keys ?? []) as string[];
  if (keys.length === 0) {
    return NextResponse.json({ error: "This set has no photos to feature" }, { status: 422 });
  }

  const { data: last } = await db
    .from("gallery_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let order = (last?.sort_order ?? 0) + 1;

  const copied: string[] = [];
  for (const key of keys) {
    const { data: blob, error: dlErr } = await db.storage.from(SESSION_BUCKET).download(key);
    if (dlErr || !blob) {
      log.error("Feature-in-gallery download failed", { key, error: dlErr?.message });
      continue;
    }
    const ext = (key.split(".").pop() || "jpg").toLowerCase();
    const newKey = `session_${id}_${copied.length}_${order}.${ext}`;
    const { error: upErr } = await db.storage
      .from(GALLERY_BUCKET)
      .upload(newKey, await blob.arrayBuffer(), { contentType: blob.type || "image/jpeg", upsert: true });
    if (upErr) {
      log.error("Feature-in-gallery upload failed", { newKey, error: upErr.message });
      continue;
    }
    const { error: insErr } = await db.from("gallery_photos").insert({
      storage_path:         newKey,
      caption_top_left:     sub.module ?? null,
      caption_bottom_right: sub.city ?? null,
      sort_order:           order,
      published:            true,
      source_submission_id: id,
    });
    if (insErr) {
      // Roll back the just-uploaded file so we don't orphan it.
      await db.storage.from(GALLERY_BUCKET).remove([newKey]);
      log.error("Feature-in-gallery insert failed", { newKey, error: insErr.message });
      continue;
    }
    copied.push(newKey);
    order += 1;
  }

  if (copied.length === 0) {
    return NextResponse.json({ error: "Failed to add the photos to the gallery" }, { status: 500 });
  }
  return NextResponse.json({ data: { featured: true, count: copied.length } });
}

// DELETE — remove this submission's photos from the public gallery.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  const { id } = await params;
  const db = createAdminClient();

  const { data: rows } = await db
    .from("gallery_photos")
    .select("id, storage_path")
    .eq("source_submission_id", id);

  const paths = (rows ?? []).map((r) => r.storage_path).filter(Boolean) as string[];
  if (paths.length) await db.storage.from(GALLERY_BUCKET).remove(paths);
  await db.from("gallery_photos").delete().eq("source_submission_id", id);

  return NextResponse.json({ data: { featured: false } });
}
