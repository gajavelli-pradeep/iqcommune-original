import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { createInvitedAccount, type AdminRole } from "@/services/auth";
import { getOpenInvite } from "@/services/link-pages";
import { AlreadyRecordedError, consumeInvite } from "@/services/link-writes";

/**
 * Consumes an admin invite, making the link single-use.
 *
 * The row acted on comes from the verified token, never from the body. A body
 * that could name its own target would let anyone activate an account against an invite that was not theirs.
 */

const bodySchema = z.object({
  t: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const { allowed, enforced } = await checkRateLimit(`invite:${clientIdentifier(request)}`);
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

    const token = verifyToken("invite", parsed.data.t);
    if (!token.ok) {
      log.info(traceId, "invite rejected", { reason: token.reason });
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }

    const invite = await getOpenInvite(token.payload.id);
    if (!invite) {
      return fail("CONFLICT", "This invite has already been used or has expired.", traceId);
    }

    // Account first, invite second. If consuming failed after the account was
    // made, the invite stays open and a retry hits the duplicate-email guard,
    // which is a conflict the person can understand. The other order would burn
    // the invite and leave them with no account and no way back.
    const account = await createInvitedAccount(
      invite.email,
      parsed.data.password,
      invite.role as AdminRole,
    );
    const receipt = await consumeInvite(token.payload.id);
    log.info(traceId, "invited account created", { userId: account.userId, role: invite.role });
    log.info(traceId, "invite recorded", { id: token.payload.id });
    return ok(receipt, 201);
  } catch (cause) {
    // Already done is not a fault. Saying "something went wrong" to someone who
    // simply submitted twice tells them to retry the thing that succeeded.
    if (cause instanceof AlreadyRecordedError) {
      return fail("CONFLICT", cause.message, traceId);
    }
    log.error(traceId, "invite failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
