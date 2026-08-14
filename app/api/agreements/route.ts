import { z } from "zod";

import { dispatchEmail } from "@/lib/email/dispatch";
import { practitionerWelcome } from "@/lib/email/templates";
import { fail, ok, readJsonBody } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import {
  AlreadyRecordedError,
  empanelBySignature,
  LinkNoLongerValidError,
  signAgreement,
} from "@/services/link-writes";

/**
 * Signs one empanelment agreement.
 *
 * The row acted on comes from the verified token, never from the body. A body
 * that could name its own target would let anyone sign an agreement in another practitioner's name.
 */

const bodySchema = z.object({
  t: z.string().min(1),
  fullName: z.string().trim().min(1, "Your full name is required").max(160),
  designation: z.string().trim().max(160),
  // Capped (audit M2): a drawn signature is a base64 PNG data URL. Without a
  // ceiling a holder of a valid onboarding token could POST a multi-MB string
  // straight into signature_data. 200k chars comfortably fits a real signature
  // canvas PNG while blocking abuse.
  signature: z
    .string()
    .min(1, "Please draw or type your signature")
    .max(200_000, "That signature is too large."),
  signatureMode: z.enum(["drawn", "typed"]),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const ip = clientIdentifier(request);
    const { allowed, enforced } = await checkRateLimit(`agreement:${ip}`);
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

    const token = verifyToken("onboarding", parsed.data.t);
    if (!token.ok) {
      log.info(traceId, "agreement rejected", { reason: token.reason });
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }

    const receipt = await signAgreement(
      token.payload.id,
      {
        fullName: parsed.data.fullName,
        designation: parsed.data.designation,
        signature: parsed.data.signature,
        signatureMode: parsed.data.signatureMode,
      },
      ip,
    );
    log.info(traceId, "agreement recorded", { id: token.payload.id });

    // Automatic transition (audit G3, step 5): a signature empanels the
    // practitioner and sends the welcome. Off the response path — the signature
    // is already recorded and must not fail on a downstream step.
    const welcome = await empanelBySignature(token.payload.id);
    if (welcome) {
      dispatchEmail(traceId, practitionerWelcome(welcome.email, welcome.firstName, welcome.reference));
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
    log.error(traceId, "agreement failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
