import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Exchanges a Supabase auth email link for a session — the standard
 * @supabase/ssr confirm route, currently used only by password recovery.
 *
 * Handles both link shapes Supabase can send, since which one arrives depends
 * on the client's configured auth flow: `token_hash` + `type` (OTP-style) or
 * `code` (PKCE) — trying both rather than assuming one.
 *
 * Requires `http://<host>/auth/confirm` to be listed in the Supabase
 * project's Authentication → URL Configuration → Redirect URLs — Supabase
 * silently drops an unlisted `redirectTo` and falls back to the Site URL
 * instead, which is a dashboard setting, not something this code can set.
 * See docs/ENVIRONMENT.md.
 */
/** The only destinations this route is allowed to send a verified user to. */
const ALLOWED_NEXT = new Set(["/reset-password"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  // `next` is a query param on an emailed link — never redirect to it
  // unchecked, or the link becomes an open redirect through our own domain.
  const next = requestedNext && ALLOWED_NEXT.has(requestedNext) ? requestedNext : "/";

  const supabase = await createServerSupabaseClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect("/login?error=invalid-reset-link");
}
