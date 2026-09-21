import { MAX_UPLOAD_BYTES } from "@/lib/email/attachment-rules";
import { requireCapability } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { addLibraryFile } from "@/services/email-attachments";
import { recordActivity } from "@/services/console";

/** The file plus multipart framing. */
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

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

  // Before the body is read: `formData()` buffers all of it.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return Response.json({ error: "That file is over 2 MB." }, { status: 413 });
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
