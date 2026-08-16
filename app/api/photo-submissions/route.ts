import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import {
  photoSubmissionSchema,
  tokenedPhotoSubmissionSchema,
  validatePhotos,
} from "@/lib/schemas/photo-submission";
import { verifyToken } from "@/lib/tokens";
import { getPhotoSubmissionOwner } from "@/services/link-pages";
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

    // Guard the multipart parse (audit M1, multipart variant): a non-form body
    // makes formData() throw, which the generic catch would report as a 500 —
    // a client error dressed as a server fault. Return 400 instead.
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("VALIDATION_FAILED", "Expected a multipart form upload.", traceId);
    }

    // Two callers: the public landing-page modal, where a stranger types their
    // own details, and the tokenised page, where the link already names the
    // practitioner and session. In the second case nothing about the owner is
    // read from the body — that is the whole point of the link.
    const token = form.get("t");
    const owner =
      typeof token === "string" && token
        ? await (async () => {
            const verified = verifyToken("photos", token);
            if (!verified.ok) return null;
            return getPhotoSubmissionOwner(verified.payload.id);
          })()
        : undefined;

    if (owner === null) {
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }
    // The tokened branch validates the record, not the sender: only the
    // organisation name and the photos came from them.
    const parsed = (owner ? tokenedPhotoSubmissionSchema : photoSubmissionSchema).safeParse(
      owner
        ? {
            submitterName: owner.practitionerName,
            submitterEmail: owner.practitionerEmail,
            organisationName: form.get("organisationName") || undefined,
            sessionDate: owner.sessionDate,
            moduleTaught: owner.module,
            participantConsent: true,
          }
        : {
            submitterName: form.get("submitterName"),
            submitterEmail: form.get("submitterEmail"),
            organisationName: form.get("organisationName") || undefined,
            sessionDate: form.get("sessionDate"),
            moduleTaught: form.get("moduleTaught"),
            participantConsent: form.get("participantConsent") === "true",
          },
    );
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] = issue.message;

      // "Please check the highlighted fields" only means something where there
      // are fields to highlight. The tokened page renders none of these — they
      // come off the record, not the form — and shows the top-level message
      // alone, so a failure there read as an instruction to fix nothing
      // visible. Say what is actually wrong instead, and where the fix lives.
      const message = owner
        ? `We could not send these photos: ${Object.values(fields).join(". ")}. This is a problem with the session record rather than anything you entered — please reply to the email that brought you here.`
        : "Please check the highlighted fields.";
      return fail("VALIDATION_FAILED", message, traceId, fields);
    }

    // Type and size are re-checked here: the browser's check is a courtesy, not
    // a control.
    const photos = form.getAll("photos").filter((entry): entry is File => entry instanceof File);
    const photoProblem = validatePhotos(photos);
    if (photoProblem) {
      return fail("VALIDATION_FAILED", photoProblem, traceId, { photos: photoProblem });
    }

    const created = await createPhotoSubmission(
      parsed.data,
      photos,
      owner ? { sessionId: owner.sessionId, practitionerId: owner.practitionerId } : undefined,
    );
    log.info(traceId, "photo submission created", { id: created.id, photoCount: created.photoCount });
    return ok(created, 201);
  } catch (cause) {
    log.error(traceId, "photo submission failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong sending your photos. Please try again.", traceId);
  }
}
