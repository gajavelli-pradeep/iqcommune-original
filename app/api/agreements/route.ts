import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { AlreadyRecordedError, signAgreement } from "@/services/link-writes";

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
  signature: z.string().min(1, "Please draw or type your signature"),
  signatureMode: z.enum(["drawn", "typed"]),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const { allowed, enforced } = await checkRateLimit(`agreement:${clientIdentifier(request)}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many requests. Please try again shortly.", traceId);
    }

    const parsed = bodySchema.safeParse(await request.json());
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

    const receipt = await signAgreement(token.payload.id, {
      fullName: parsed.data.fullName,
      designation: parsed.data.designation,
      signature: parsed.data.signature,
      signatureMode: parsed.data.signatureMode,
    });
    log.info(traceId, "agreement recorded", { id: token.payload.id });
    return ok(receipt, 201);
  } catch (cause) {
    // Already done is not a fault. Saying "something went wrong" to someone who
    // simply submitted twice tells them to retry the thing that succeeded.
    if (cause instanceof AlreadyRecordedError) {
      return fail("CONFLICT", cause.message, traceId);
    }
    log.error(traceId, "agreement failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
