import { z } from "zod";

import { fail, ok, readJsonBody } from "@/lib/api/response";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { verifyToken } from "@/lib/tokens";
import { toConsoleRole } from "@/features/console/roles";
import { createInvitedAccount } from "@/services/auth";
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
  // 8-char floor matches the V7 spec (iqcommune-user-setup.html) and the parity
  // tests. Audit L1 recommends raising this to 12 + a breach check for these
  // privileged admin accounts — a product/policy change that needs client
  // sign-off, tracked in flaws.md, not applied unilaterally against the clone.
  password: z.string().min(8, "Password must be at least 8 characters."),
  // Not on the invite — nobody types a colleague's name when inviting them,
  // so the person accepting supplies it, same as the password (client,
  // 2026-08-19).
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const { allowed, enforced } = await checkRateLimit(`invite:${clientIdentifier(request)}`);
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

    const token = verifyToken("invite", parsed.data.t);
    if (!token.ok) {
      log.info(traceId, "invite rejected", { reason: token.reason });
      return fail("FORBIDDEN", "This link is no longer valid.", traceId);
    }

    const invite = await getOpenInvite(token.payload.id);
    if (!invite) {
      return fail("CONFLICT", "This invite has already been used or has expired.", traceId);
    }

    // Never trust the stored role as a bare cast (audit C3): route it through
    // the fail-closed validator that the console uses, so an unrecognised value
    // can never become a privilege in app_metadata.
    const role = toConsoleRole(invite.role);
    if (!role) {
      log.error(traceId, "invite carries an unrecognised role", { id: token.payload.id });
      return fail("INTERNAL", "This invite is misconfigured. Please contact support.", traceId);
    }

    // Account first, invite second. If consuming failed after the account was
    // made, the invite stays open and a retry hits the duplicate-email guard,
    // which is a conflict the person can understand. The other order would burn
    // the invite and leave them with no account and no way back.
    const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
    const account = await createInvitedAccount(invite.email, parsed.data.password, role, fullName);
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
