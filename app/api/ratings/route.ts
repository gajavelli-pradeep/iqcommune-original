import { z } from "zod";

import { fail, ok, readJsonBody } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
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
