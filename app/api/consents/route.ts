import { z } from "zod";

import { fail, ok, readJsonBody } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { AlreadyRecordedError, LinkNoLongerValidError, recordConsent } from "@/services/link-writes";

/**
 * Records a practitioner's consent to one confirmed session and its payout.
 *
 * The row acted on comes from the verified token, never from the body. A body
 * that could name its own target would let anyone consent on someone else's behalf.
 */

const bodySchema = z.object({
  t: z.string().min(1),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const ip = clientIdentifier(request);
    const { allowed, enforced } = await checkRateLimit(`consent:${ip}`);
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

    const token = verifyToken("consent", parsed.data.t);
    if (!token.ok) {
      log.info(traceId, "consent rejected", { reason: token.reason });
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }

    const receipt = await recordConsent(token.payload.id, ip);
    log.info(traceId, "consent recorded", { id: token.payload.id });
    return ok(receipt, 201);
  } catch (cause) {
    // A dead link (cancelled/removed assignment) is not a server fault.
    if (cause instanceof LinkNoLongerValidError) {
      return fail("FORBIDDEN", cause.message, traceId);
    }
    // Already done is not a fault. Saying "something went wrong" to someone who
    // simply submitted twice tells them to retry the thing that succeeded.
    if (cause instanceof AlreadyRecordedError) {
      return fail("CONFLICT", cause.message, traceId);
    }
    log.error(traceId, "consent failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
