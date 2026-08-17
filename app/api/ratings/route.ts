import { z } from "zod";

import { fail, ok, readJsonBody } from "@/lib/api/response";
import { FEEDBACK_INBOX } from "@/constants/inboxes";
import { dispatchEmail } from "@/lib/email/dispatch";
import { newRatingForAdmin } from "@/lib/email/templates";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { getRatedSession } from "@/services/link-pages";
import { AlreadyRecordedError, LinkNoLongerValidError, recordRating } from "@/services/link-writes";

/**
 * Records a practitioner rating against one session assignment.
 *
 * The row acted on comes from the verified token, never from the body. A body
 * that could name its own target would let anyone rate any practitioner they liked.
 */

const bodySchema = z.object({
  t: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comments: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const ip = clientIdentifier(request);
    const { allowed, enforced } = await checkRateLimit(`rating:${ip}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many requests. Please try again shortly.", traceId);
    }

    const body = await readJsonBody(request);
    if (!body.ok) {
      return fail("VALIDATION_FAILED", "Request body must be valid JSON.", traceId);
    }
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message;
      return fail("VALIDATION_FAILED", "Please check the highlighted fields.", traceId, fields);
    }

    const token = verifyToken("rate", parsed.data.t);
    if (!token.ok) {
      log.info(traceId, "rating rejected", { reason: token.reason });
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }

    const receipt = await recordRating(token.payload.id, parsed.data.rating, parsed.data.comments, ip);
    log.info(traceId, "rating recorded", { id: token.payload.id });

    // Told to the team, not merely stored (client, 2026-08-17). A rating used to
    // sit on the assignment until somebody went looking for it, which is not how
    // a complaint gets noticed.
    //
    // After the write and off the response path, the way the other two public
    // forms do it: the rating is saved, and a slow or failing mail provider must
    // not turn that into an error the person sees. The context lookup is inside
    // the same guard for the same reason — this whole block is about telling
    // someone, and none of it may cost the submission.
    try {
      const session = await getRatedSession(token.payload.id);
      if (session) {
        dispatchEmail(
          traceId,
          // A fixed inbox, not `adminInboxFor` — that reads
          // ADMIN_NOTIFY_SESSION first and may resolve elsewhere, and this
          // address was named specifically.
          newRatingForAdmin(FEEDBACK_INBOX, {
            rating: parsed.data.rating,
            comments: parsed.data.comments,
            practitioner: session.practitioner,
            module: session.module,
            sessionDate: session.sessionDate,
            city: session.city,
            reference: session.reference,
            requestedBy: session.requestedBy,
          }),
        );
      } else {
        // The rating is recorded either way; what is lost is only the notice.
        log.warn(traceId, "rating notice skipped — session context missing", { id: token.payload.id });
      }
    } catch (cause) {
      log.error(traceId, "rating notice failed", { cause: String(cause) });
    }

    return ok(receipt, 201);
  } catch (cause) {
    if (cause instanceof LinkNoLongerValidError) {
      return fail("FORBIDDEN", cause.message, traceId);
    }
    // Already done is not a fault. Saying "something went wrong" to someone who
    // simply submitted twice tells them to retry the thing that succeeded.
    if (cause instanceof AlreadyRecordedError) {
      return fail("CONFLICT", cause.message, traceId);
    }
    log.error(traceId, "rating failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
