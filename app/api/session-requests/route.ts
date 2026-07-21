import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { sessionRequestSubmission } from "@/lib/schemas/session-request";
import { createSessionRequest } from "@/services/session-requests";

/**
 * Public write. Untrusted input, so: rate limit, then validate with the same
 * schema the form used, then hand to the service. Nothing reaches the database
 * before all three.
 */
export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const { allowed, enforced } = await checkRateLimit(`session-request:${clientIdentifier(request)}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many requests. Please try again shortly.", traceId);
    }

    const parsed = sessionRequestSubmission.safeParse(await request.json());
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] = issue.message;
      log.info(traceId, "session request rejected by validation", { fieldCount: Object.keys(fields).length });
      return fail("VALIDATION_FAILED", "Please check the highlighted fields.", traceId, fields);
    }

    const created = await createSessionRequest(parsed.data);
    log.info(traceId, "session request created", { id: created.id, audience: parsed.data.audience });
    return ok(created, 201);
  } catch (cause) {
    // Never surface the underlying message: it can carry column names and
    // constraint text. The trace id is what ties this reply to the detail.
    log.error(traceId, "session request failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong sending your request. Please try again.", traceId);
  }
}
