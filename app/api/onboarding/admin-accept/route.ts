import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isExpired } from "@/lib/admin-invite";
import { logActivity } from "@/lib/admin-audit";
import { storeAdminPassword } from "@/lib/admin-password-vault";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { z } from "zod";

const AcceptSchema = z.object({
  token:    z.string().min(32),
  name:     z.string().trim().min(2, "Name is required").max(120),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Public — an invited person redeems their single-use token, sets their own
// password, and their `admin` account is created. Role is hard-locked to
// 'admin' here regardless of anything in the request.
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(reset) } }
    );
  }

  const parsed = AcceptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error?.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { token, name, password } = parsed.data;

  const supabase = createAdminClient();

  const { data: invite, error: fetchErr } = await supabase
    .from("admin_invites")
    .select("id, email, status, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (fetchErr) {
    log.error("Admin-accept invite lookup failed", { error: fetchErr.message });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "This invite link is invalid" }, { status: 403 });
  }
  if (invite.status !== "Pending") {
    return NextResponse.json({ error: "This invite has already been used or revoked" }, { status: 410 });
  }
  if (isExpired(invite.expires_at)) {
    await supabase.from("admin_invites").update({ status: "Expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  // Create the admin account. Role hard-locked to 'admin'.
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { name },
  });

  if (createErr || !created.user) {
    const already = createErr?.status === 422 || /already/i.test(createErr?.message ?? "");
    if (already) {
      // Someone created this account by other means — retire the invite.
      await supabase.from("admin_invites").update({ status: "Expired" }).eq("id", invite.id);
      return NextResponse.json({ error: "An account for this email already exists" }, { status: 409 });
    }
    log.error("Admin-accept create user failed", { error: createErr?.message });
    return NextResponse.json({ error: "Failed to create your account" }, { status: 500 });
  }

  // Consume the invite atomically — only flip a still-Pending row so a double
  // submit can't create two accounts (the second create already 409s above).
  const { data: consumed } = await supabase
    .from("admin_invites")
    .update({
      status: "Accepted",
      accepted_at: new Date().toISOString(),
      created_user_id: created.user.id,
    })
    .eq("id", invite.id)
    .eq("status", "Pending")
    .select("id")
    .maybeSingle();

  if (!consumed) {
    // Lost a race — another request consumed it. Remove the extra account.
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }

  // Store the password the invitee chose so the Global Admin can reveal it too.
  // set_by is the invitee's own email — it was self-chosen via the invite.
  await storeAdminPassword(created.user.id, password, invite.email);

  await logActivity({
    actorEmail: invite.email,
    actorRole: "admin",
    action: "accept_admin_invite",
    recordTable: "auth.users",
    recordId: created.user.id,
    snapshot: { email: invite.email, name, invite_id: invite.id },
  });

  return NextResponse.json({ ok: true, email: invite.email }, { status: 201 });
}
