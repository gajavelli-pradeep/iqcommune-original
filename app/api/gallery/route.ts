import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export const GALLERY_BUCKET = "gallery";

// Public — powers the homepage "Sessions in the room" section. Returns only
// published photos, in display order, with public (non-expiring) image URLs.
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, caption_top_left, caption_bottom_right")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    log.error("Gallery GET failed", { error: error.message });
    return NextResponse.json({ photos: [] });
  }

  const photos = (data ?? []).map((p) => ({
    id: p.id,
    url: supabase.storage.from(GALLERY_BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
    topLeft: p.caption_top_left,
    bottomRight: p.caption_bottom_right,
  }));

  return NextResponse.json({ photos });
}
