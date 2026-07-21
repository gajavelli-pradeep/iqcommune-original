import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { photoSubmissionSchema, validatePhotos } from "@/lib/schemas/photo-submission";
import { createPhotoSubmission } from "@/services/photo-submissions";

/** Public multipart write: photos plus the consent that permits publishing them. */
export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const { allowed, enforced } = await checkRateLimit(`photo-submission:${clientIdentifier(request)}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many uploads. Please try again shortly.", traceId);
    }

    const form = await request.formData();
    const parsed = photoSubmissionSchema.safeParse({
      submitterName: form.get("submitterName"),
      submitterEmail: form.get("submitterEmail"),
      organisationName: form.get("organisationName") || undefined,
      sessionDate: form.get("sessionDate"),
      moduleTaught: form.get("moduleTaught"),
      participantConsent: form.get("participantConsent") === "true",
    });
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] = issue.message;
      return fail("VALIDATION_FAILED", "Please check the highlighted fields.", traceId, fields);
    }

    // Type and size are re-checked here: the browser's check is a courtesy, not
    // a control.
    const photos = form.getAll("photos").filter((entry): entry is File => entry instanceof File);
    const photoProblem = validatePhotos(photos);
    if (photoProblem) {
      return fail("VALIDATION_FAILED", photoProblem, traceId, { photos: photoProblem });
    }

    const created = await createPhotoSubmission(parsed.data, photos);
    log.info(traceId, "photo submission created", { id: created.id, photoCount: created.photoCount });
    return ok(created, 201);
  } catch (cause) {
    log.error(traceId, "photo submission failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong sending your photos. Please try again.", traceId);
  }
}
