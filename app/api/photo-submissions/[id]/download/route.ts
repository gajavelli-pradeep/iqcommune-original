import { getConsoleSession } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordActivity } from "@/services/console";

/**
 * Returns short-lived signed URLs for one submission's photos (V7's "Download
 * Photos").
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = newTraceId();
  const { email: actor } = await getConsoleSession();
  const { id } = await params;

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

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(keys, LINK_TTL_SECONDS);

  if (signError) {
    log.error(traceId, "signing photo urls failed", { message: signError.message });
    return Response.json({ error: "Could not prepare those photos." }, { status: 500 });
  }

  const session = Array.isArray(data.sessions) ? data.sessions[0] : data.sessions;

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
