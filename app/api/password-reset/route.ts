import { z } from "zod";

import { fail, ok, readJsonBody } from "@/lib/api/response";
import { env } from "@/lib/env";
import { log, newTraceId } from "@/lib/logger";
import { checkRateLimit, clientIdentifier } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Public "forgot password" — the login page's entry, for a signed-out admin.
 *
 * Supabase's own `resetPasswordForEmail` always reports success, whether or
 * not the address has an account — so this route can't leak that either, and
 * never has to decide when to lie about it. A genuine send failure (bad
 * config, provider outage) is the only case it surfaces.
 */

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

export async function POST(request: Request) {
  const traceId = newTraceId();

  try {
    const ip = clientIdentifier(request);
    const { allowed, enforced } = await checkRateLimit(`password-reset:${ip}`);
    if (!enforced) log.warn(traceId, "rate limiting not enforced — no Upstash credentials");
    if (!allowed) {
      return fail("RATE_LIMITED", "Too many requests. Please try again shortly.", traceId);
    }

    const body = await readJsonBody(request);
    if (!body.ok) return fail("VALIDATION_FAILED", "Request body must be valid JSON.", traceId);
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) {
      return fail("VALIDATION_FAILED", "Enter a valid email address.", traceId, {
        email: "Enter a valid email address.",
      });
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_BASE_URL}/auth/confirm?next=/reset-password`,
    });

    if (error) {
      log.warn(traceId, "password reset email failed", { reason: error.message });
      return fail("INTERNAL", "Couldn't send the reset email. Please try again.", traceId);
    }

    log.info(traceId, "password reset requested");
    return ok({ sent: true });
  } catch (cause) {
    log.error(traceId, "password reset request failed", { cause: String(cause) });
    return fail("INTERNAL", "Something went wrong. Please try again.", traceId);
  }
}
