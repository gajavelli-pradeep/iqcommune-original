import { requireCapability } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { addLibraryFile } from "@/services/email-attachments";
import { recordActivity } from "@/services/console";

/**
 * Saves a dropped/picked file to the reusable library.
 *
 * A route rather than a server action: actions cap their request body at 1 MB
 * by default, and a PDF or flyer can be larger. `mutate` only — the view-only
 * `user` role cannot upload.
 */
export async function POST(request: Request) {
  const traceId = newTraceId();
  let actor: string;
  try {
    ({ email: actor } = await requireCapability("mutate"));
  } catch {
    return Response.json({ error: "You cannot upload files." }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received." }, { status: 400 });

  try {
    const { id } = await addLibraryFile(
      { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) },
      actor,
    );
    void recordActivity({
      actorEmail: actor,
      action: "email-attachment.uploaded",
      entityType: "email-attachment",
      entityRef: id,
    });
    return Response.json({ id });
  } catch (cause) {
    log.warn(traceId, "email attachment upload refused", { cause: String(cause) });
    return Response.json({ error: cause instanceof Error ? cause.message : "Upload failed." }, { status: 400 });
  }
}
