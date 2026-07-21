import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
// `applicationSchema` directly, with no `applicationSubmission` sibling: unlike
// the session request, this form has no cross-field rules to refine.
import { applicationSchema } from "@/lib/schemas/application";
import { createApplication } from "@/services/applications";

/** Public write. Rate limit, then validate, then hand to the service. */
export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    // Its own prefix: sharing one with session-requests would let traffic on
    // either form exhaust the other's budget.
    const { allowed, enforced } = await checkRateLimit(`application:${clientIdentifier(request)}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many requests. Please try again shortly.", traceId);
    }

    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      // Keyed on the first path segment: an array field yields paths like
      // ["modules", 0], and a joined "modules.0" key matches no error slot in
      // the form, so the message would be dropped silently.
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message;
      log.info(traceId, "application rejected by validation", {
        fieldCount: Object.keys(fields).length,
      });
      return fail("VALIDATION_FAILED", "Please check the highlighted fields.", traceId, fields);
    }

    const created = await createApplication(parsed.data);
    log.info(traceId, "application created", {
      id: created.id,
      moduleCount: parsed.data.modules.length,
    });
    return ok(created, 201);
  } catch (cause) {
    log.error(traceId, "application failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong sending your application. Please try again.", traceId);
  }
}
