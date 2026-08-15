import { fail, ok, readJsonBody } from "@/lib/api/response";
import { dispatchEmail } from "@/lib/email/dispatch";
import { adminInboxFor } from "@/lib/email/send";
import { applicationReceived, newApplicationForAdmin } from "@/lib/email/templates";
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

    const body = await readJsonBody(request);
    if (!body.ok) {
      return fail("VALIDATION_FAILED", "Request body must be valid JSON.", traceId);
    }
    const parsed = applicationSchema.safeParse(body.value);
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

    // Off the response path via dispatchEmail → after() (audit C2): the
    // application is already saved, and a slow or failing mail provider must
    // not turn a successful submission into an error the person sees.
    dispatchEmail(
      traceId,
      applicationReceived(parsed.data.email, parsed.data.firstName, created.id),
    );
    // The practitioner team's own inbox, not the shared one — see `adminInboxFor`.
    const adminInbox = adminInboxFor("practitioner");
    if (adminInbox) {
      dispatchEmail(
        traceId,
        newApplicationForAdmin(adminInbox, {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          jobTitle: parsed.data.jobTitle,
          experience: parsed.data.experience,
          city: parsed.data.city,
          state: parsed.data.state,
          modules: parsed.data.modules,
          email: parsed.data.email,
          phone: parsed.data.phone,
        }),
      );
    }
    return ok(created, 201);
  } catch (cause) {
    log.error(traceId, "application failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong sending your application. Please try again.", traceId);
  }
}
