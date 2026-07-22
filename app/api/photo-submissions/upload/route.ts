import { requireCapability } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { MAX_PHOTOS } from "@/lib/schemas/photo-submission";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPhotoSubmission } from "@/services/photo-submissions";
import { recordActivity } from "@/services/console";

/**
 * An admin uploading photos on a practitioner's behalf (V7's "Upload" button).
 *
 * The V7 subtitle explains why this exists: photos land automatically when the
 * practitioner uses their link, "or upload them yourself if they send them
 * another way" — over WhatsApp, usually. Without it those sessions sit empty
 * forever.
 *
 * A route rather than a server action because it carries files: a server action
 * would have to marshal them through the RSC payload, and the sniff-and-store
 * path already exists here.
 *
 * Consent is recorded as given by the practitioner, because the practitioner is
 * the one who obtained it in the room — the admin is only the courier. That is
 * a claim worth being explicit about rather than defaulting silently, so the
 * caller must assert it.
 */

export async function POST(request: Request) {
  const traceId = newTraceId();
  const { email: actor } = await requireCapability("mutate");

  const form = await request.formData();
  const sessionId = form.get("sessionId");
  const consent = form.get("participantConsent") === "true";
  const photos = form.getAll("photos").filter((entry): entry is File => entry instanceof File);

  if (typeof sessionId !== "string" || !sessionId) {
    return Response.json({ error: "Which session are these for?" }, { status: 400 });
  }
  if (photos.length === 0) {
    return Response.json({ error: "Choose at least one photo." }, { status: 400 });
  }
  if (photos.length > MAX_PHOTOS) {
    return Response.json({ error: `Up to ${MAX_PHOTOS} photos at a time.` }, { status: 400 });
  }
  if (!consent) {
    return Response.json(
      { error: "Confirm the practitioner obtained participant consent before uploading." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      "id, reference, module, session_date, status, session_practitioners ( practitioner_id, deleted_at, practitioners ( full_name, email ) )",
    )
    .eq("id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error(traceId, "session read failed", { message: error.message });
    return Response.json({ error: "Could not read that session." }, { status: 500 });
  }
  if (!session) return Response.json({ error: "No such session." }, { status: 404 });

  // One live submission per session — V7 disables Upload once photos exist and
  // tells you to delete to re-upload, so a second set must not silently append.
  const { data: existing } = await supabase
    .from("photo_submissions")
    .select("id")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return Response.json(
      { error: "This session already has photos. Delete them first to re-upload." },
      { status: 409 },
    );
  }

  const assignment = ((session.session_practitioners ?? []) as Array<{
    practitioner_id: string;
    deleted_at: string | null;
    practitioners: unknown;
  }>).find((entry) => !entry.deleted_at);
  const practitioner = Array.isArray(assignment?.practitioners)
    ? assignment?.practitioners[0]
    : assignment?.practitioners;

  try {
    const created = await createPhotoSubmission(
      {
        submitterName: (practitioner?.full_name as string) ?? "Practitioner",
        submitterEmail: (practitioner?.email as string) ?? "",
        organisationName: "",
        sessionDate: session.session_date as string,
        moduleTaught: session.module as string,
        participantConsent: true,
      },
      photos,
      assignment ? { sessionId: session.id, practitionerId: assignment.practitioner_id } : undefined,
    );

    await recordActivity({
      actorEmail: actor,
      action: "photos.uploaded_by_admin",
      entityType: "session",
      entityRef: sessionId,
      detail: `${created.photoCount} photo(s) for ${session.reference}, received outside the upload link`,
    });

    return Response.json({ ok: true, photoCount: created.photoCount });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    log.error(traceId, "admin photo upload failed", { message });
    // The sniff rejects a mislabelled file; that is the caller's problem to fix
    // and worth saying, unlike an internal fault.
    const isContent = message.includes("not a valid JPEG or PNG");
    return Response.json(
      { error: isContent ? "Those files must be JPEG or PNG images." : "The upload failed." },
      { status: isContent ? 400 : 500 },
    );
  }
}
