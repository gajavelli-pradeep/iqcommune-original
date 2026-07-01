import { NextRequest, NextResponse } from "next/server";
import { requireGalleryAccess } from "@/lib/supabase/require-gallery-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const GALLERY_BUCKET  = "gallery";
const MAX_FILE_BYTES  = 5 * 1024 * 1024; // 5 MB

function detectMime(header: Uint8Array): string | null {
  if (header[0] === 0xff && header[1] === 0xd8) return "image/jpeg";
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return "image/png";
  // WebP: "RIFF"…"WEBP"
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) return "image/webp";
  return null;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function withUrl(supabase: ReturnType<typeof createAdminClient>, row: { storage_path: string }) {
  return supabase.storage.from(GALLERY_BUCKET).getPublicUrl(row.storage_path).data.publicUrl;
}

// GET — all gallery photos (published + drafts), in display order, for the admin manager.
export async function GET() {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Admin gallery GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }

  const photos = (data ?? []).map((p) => ({ ...p, url: withUrl(supabase, p) }));
  return NextResponse.json({ photos });
}

// POST — upload a new gallery photo (multipart: photo + captions + published).
export async function POST(req: NextRequest) {
  const denied = await requireGalleryAccess();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A photo file is required" }, { status: 422 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Image exceeds the 5 MB limit" }, { status: 422 });
  }
  const mime = detectMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mime) {
    return NextResponse.json({ error: "Not a valid JPEG, PNG or WebP image" }, { status: 422 });
  }

  const captionTopLeft     = (form.get("captionTopLeft")     as string | null)?.trim() || null;
  const captionBottomRight = (form.get("captionBottomRight") as string | null)?.trim() || null;
  const published          = form.get("published") !== "false"; // default published

  const supabase = createAdminClient();
  const key = `${Date.now()}_${Math.round(Number(file.size))}.${EXT[mime]}`;

  const { error: uploadErr } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(key, await file.arrayBuffer(), { contentType: mime, upsert: false });
  if (uploadErr) {
    log.error("Gallery upload failed", { key, error: uploadErr.message });
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }

  // Place new photos at the end of the current order.
  const { data: last } = await supabase
    .from("gallery_photos")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? 0) + 1;

  const { data: row, error: dbErr } = await supabase
    .from("gallery_photos")
    .insert({
      storage_path:         key,
      caption_top_left:     captionTopLeft,
      caption_bottom_right: captionBottomRight,
      sort_order:           nextOrder,
      published,
    })
    .select("*")
    .single();

  if (dbErr || !row) {
    log.error("Gallery insert failed — cleaning up storage", { error: dbErr?.message });
    await supabase.storage.from(GALLERY_BUCKET).remove([key]);
    return NextResponse.json({ error: "Failed to save gallery photo" }, { status: 500 });
  }

  return NextResponse.json({ data: { ...row, url: withUrl(supabase, row) } }, { status: 201 });
}
