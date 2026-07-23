import "server-only";

import { GALLERY_LIMIT } from "@/constants/gallery";
import { createAdminClient } from "@/lib/supabase/admin";

/** Published gallery photos for the public landing page. */

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  city: string;
}

const BUCKET = "gallery";

/**
 * Reads what the console guarantees. This was hardcoded to 12 while the publish
 * action evicted down to GALLERY_LIMIT (20), so eight published photos could be
 * carried, counted in the console's "N / 20", and never shown.
 */
export async function listPublishedPhotos(limit = GALLERY_LIMIT): Promise<GalleryPhoto[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, caption, city")
    .eq("published", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`gallery_photos read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
    caption: row.caption,
    city: row.city,
  }));
}