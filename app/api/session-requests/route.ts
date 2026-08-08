import { fail, ok, readJsonBody } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { AUDIENCE_LABELS, sessionRequestSubmission } from "@/lib/schemas/session-request";
import { dispatchEmail } from "@/lib/email/dispatch";
import { newSessionRequestForAdmin, sessionRequestReceived } from "@/lib/email/templates";
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

    const body = await readJsonBody(request);
    if (!body.ok) {
      return fail("VALIDATION_FAILED", "Request body must be valid JSON.", traceId);
    }
    const parsed = sessionRequestSubmission.safeParse(body.value);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] = issue.message;
      log.info(traceId, "session request rejected by validation", { fieldCount: Object.keys(fields).length });
      return fail("VALIDATION_FAILED", "Please check the highlighted fields.", traceId, fields);
    }

    const created = await createSessionRequest(parsed.data);
    log.info(traceId, "session request created", { id: created.id, audience: parsed.data.audience });

    // Off the response path via dispatchEmail → after() (audit C2): the request
    // is already saved, and a slow or failing mail provider must not turn a
    // successful submission into an error the person sees.
    dispatchEmail(
      traceId,
      sessionRequestReceived(parsed.data.email, parsed.data.firstName, parsed.data.topic),
    );
    const adminInbox = process.env.ADMIN_NOTIFY_EMAIL || process.env.BREVO_SENDER_EMAIL;
    if (adminInbox) {
      dispatchEmail(
        traceId,
        newSessionRequestForAdmin(adminInbox, {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          audience: AUDIENCE_LABELS[parsed.data.audience],
          topic: parsed.data.topic,
          organisationName: parsed.data.organisationName,
          groupSize: parsed.data.groupSize,
          city: parsed.data.city,
          state: parsed.data.state,
          preferredWindow: parsed.data.preferredWindow,
          email: parsed.data.email,
          phone: parsed.data.phone,
        }),
      );
    }
    return ok(created, 201);
  } catch (cause) {
    // Never surface the underlying message: it can carry column names and
    // constraint text. The trace id is what ties this reply to the detail.
    log.error(traceId, "session request failed", { cause: String(cause) });
    // "in a few minutes", not "again": what reaches this catch is a dependency
    // being down, and an immediate retry fails identically. The modal pairs this
    // with a mailto fallback so the visitor is not left with only the retry.
    return fail(
      "INTERNAL",
      "Something went wrong sending your request. Please try again in a few minutes.",
      traceId,
    );
  }
}
