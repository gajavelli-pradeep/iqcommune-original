import { requireCapability } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sniffImageType } from "@/services/photo-submissions";
import { recordActivity } from "@/services/console";

/**
 * Uploads photos into the gallery's DRAFT area (V7 tab 8).
 *
 * Draft, never live: a photo lands here with no caption and no city, gets both
 * typed in the panel, and only then is published. The bucket is public — the
 * landing page serves from it directly — so an object written here is readable
 * by anyone who knows its path. That is exactly why the `published` flag gates
 * what the site renders, and why nothing else may write to this bucket.
 *
 * Content is sniffed, not trusted: `file.type` is client-declared, so an
 * allow-list on it would let an HTML/SVG polyglot be stored under a public URL
 * and served from the site's own origin.
 */

const BUCKET = "gallery";
const MAX_FILES = 20;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const traceId = newTraceId();
  const { email: actor } = await requireCapability("mutate");

  const form = await request.formData();
  const photos = form.getAll("photos").filter((entry): entry is File => entry instanceof File);

  if (photos.length === 0) return Response.json({ error: "Choose at least one photo." }, { status: 400 });
  if (photos.length > MAX_FILES) {
    return Response.json({ error: `Up to ${MAX_FILES} photos at a time.` }, { status: 400 });
  }
  if (photos.some((photo) => photo.size > MAX_BYTES)) {
    return Response.json({ error: "Each photo must be under 10MB." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const written: string[] = [];

  try {
    for (const photo of photos) {
      const sniffed = await sniffImageType(photo);
      if (!sniffed) throw new Error("photo content is not a valid JPEG or PNG");

      const key = `${crypto.randomUUID()}.${sniffed === "image/png" ? "png" : "jpg"}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, photo, { contentType: sniffed, upsert: false });
      if (error) throw new Error(`gallery upload failed: ${error.message}`);
      written.push(key);
    }

    const { error } = await supabase.from("gallery_photos").insert(
      written.map((key) => ({ storage_path: key, published: false, caption: null, city: null })),
    );
    if (error) throw new Error(`gallery_photos insert failed: ${error.message}`);

    await recordActivity({
      actorEmail: actor,
      action: "gallery.drafted",
      entityType: "gallery",
      detail: `${written.length} photo(s) added to the gallery draft.`,
    });

    return Response.json({ ok: true, added: written.length });
  } catch (cause) {
    // Any failure leaves no orphaned objects: nothing references them, so
    // row-based cleanup would never reach them.
    if (written.length > 0) await supabase.storage.from(BUCKET).remove(written);

    const message = cause instanceof Error ? cause.message : String(cause);
    log.error(traceId, "gallery upload failed", { message });
    const isContent = message.includes("not a valid JPEG or PNG");
    return Response.json(
      { error: isContent ? "Those files must be JPEG or PNG images." : "The upload failed." },
      { status: isContent ? 400 : 500 },
    );
  }
}
