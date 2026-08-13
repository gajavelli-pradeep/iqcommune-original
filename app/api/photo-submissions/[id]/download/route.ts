import JSZip from "jszip";

import { getConsoleSession } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordActivity } from "@/services/console";

/**
 * One submission's photos (V7's "Download Photos"), in two modes.
 *
 * Without `?format=zip` it returns short-lived signed URLs, which is what the
 * dialog renders its thumbnails from. With it, the selected photos come back as
 * a single archive.
 *
 * The archive is why this route serves bytes at all. Saving each photo
 * separately meant clicking a cross-origin `<a download>` per file, and browsers
 * ignore `download` across origins — so the first click navigated to the image
 * and unloaded the console, taking the queued clicks with it. Streaming one
 * same-origin zip removes the origin problem, the multiple-download prompt and
 * the staggered-click workaround together.
 *
 * The bucket is private and stays private: session photos show identifiable
 * participants who consented to a specific use, so they are never served from a
 * public URL. Signed links expire in five minutes, which is long enough to
 * click through and short enough that a copied URL is worthless tomorrow.
 *
 * Behind the console session — the User role is "view & download only", so
 * every role may take a copy, and every copy is logged.
 */

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET || "session-photos";
const LINK_TTL_SECONDS = 300;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = newTraceId();
  const { email: actor } = await getConsoleSession();
  const { id } = await params;
  const query = new URL(request.url).searchParams;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("photo_submissions")
    .select("id, storage_keys, submitter_name, session_date, sessions ( reference )")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error(traceId, "photo submission read failed", { message: error.message });
    return Response.json({ error: "Could not read that submission." }, { status: 500 });
  }
  if (!data) return Response.json({ error: "No such submission." }, { status: 404 });

  const keys = (data.storage_keys ?? []) as string[];
  if (keys.length === 0) return Response.json({ photos: [] });

  const session = Array.isArray(data.sessions) ? data.sessions[0] : data.sessions;

  if (query.get("format") === "zip") {
    // `select` carries the indices the admin ticked. Absent means everything,
    // so a bare ?format=zip is still a whole-submission download.
    const chosen = query.get("select");
    const wanted = chosen
      ? new Set(chosen.split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0))
      : null;
    const picked = keys.filter((_, index) => !wanted || wanted.has(index));
    if (picked.length === 0) {
      return Response.json({ error: "No photos selected." }, { status: 400 });
    }

    const zip = new JSZip();
    const reference = session?.reference ?? "session";

    for (const [index, key] of picked.entries()) {
      const { data: file, error: fileError } = await supabase.storage.from(BUCKET).download(key);
      if (fileError || !file) {
        log.error(traceId, "photo download failed", { key, message: fileError?.message });
        return Response.json({ error: "Could not read one of those photos." }, { status: 502 });
      }
      // The extension comes off the stored key. The per-file download this
      // replaces named its saves without one, so they arrived typeless.
      const extension = key.slice(key.lastIndexOf(".") + 1) || "jpg";
      zip.file(`${reference}-photo-${index + 1}.${extension}`, await file.arrayBuffer());
    }

    const archive = await zip.generateAsync({
      // An ArrayBuffer rather than a Uint8Array: only the former is a BodyInit.
      type: "arraybuffer",
      // Photos are already compressed; DEFLATE would spend time to save
      // nothing. STORE keeps the archive fast and the bytes identical.
      compression: "STORE",
    });

    void recordActivity({
      actorEmail: actor,
      action: "photos.downloaded",
      entityType: "photo_submission",
      entityRef: id,
      detail: `${picked.length} photo(s) as a zip${session?.reference ? ` for ${session.reference}` : ""}.`,
    });

    return new Response(archive, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${reference}-photos.zip"`,
        "Content-Length": String(archive.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(keys, LINK_TTL_SECONDS);

  if (signError) {
    log.error(traceId, "signing photo urls failed", { message: signError.message });
    return Response.json({ error: "Could not prepare those photos." }, { status: 500 });
  }

  void recordActivity({
    actorEmail: actor,
    action: "photos.downloaded",
    entityType: "photo_submission",
    entityRef: id,
    detail: `${keys.length} photo(s)${session?.reference ? ` for ${session.reference}` : ""}.`,
  });

  return Response.json(
    {
      session: session?.reference ?? null,
      photos: (signed ?? [])
        .filter((entry) => entry.signedUrl)
        .map((entry, index) => ({ name: `photo-${index + 1}`, url: entry.signedUrl })),
    },
    // The URLs inside are short-lived credentials; never let a cache hold them.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
