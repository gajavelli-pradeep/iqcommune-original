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
    .select("id, email, role, status, expires_at")
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

  // Provision the role the invite was created with (V5 parity). Clamp to the known
  // set so a malformed row can't inject an arbitrary role; global_admin is a valid
  // invite role per the client-mandated Settings invite (see invites/route.ts).
  const inviteRole =
    invite.role === "user" || invite.role === "global_admin" ? invite.role : "admin";
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    app_metadata: { role: inviteRole },
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
  const { data: consumed, error: consumeErr } = await supabase
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

  // A failed query and a lost race both leave `consumed` empty, but they demand
  // opposite responses — and only one of them may delete the account we just made.
  // Treat "the update errored" as retryable and KEEP the account: deleting it here
  // would destroy a legitimate first-time acceptance over a transient DB blip and
  // lock the invitee out with a message ("already used") that is simply false.
  if (consumeErr) {
    log.error("Admin-accept invite consume failed — keeping account, invite left Pending", {
      error: consumeErr.message,
      code: consumeErr.code,
      inviteId: invite.id,
      userId: created.user.id,
    });
    return NextResponse.json(
      { error: "Your account was created but we couldn't finish setting it up. Contact your global admin before trying again." },
      { status: 500 }
    );
  }

  if (!consumed) {
    // Genuinely lost the race: the query succeeded and matched no still-Pending row,
    // so another request already consumed this invite. Remove the extra account.
    const { error: delErr } = await supabase.auth.admin.deleteUser(created.user.id);
    if (delErr) {
      log.error("Admin-accept failed to remove orphaned account after invite race", {
        error: delErr.message,
        userId: created.user.id,
        inviteId: invite.id,
      });
    }
    return NextResponse.json({ error: "This invite has already been used" }, { status: 410 });
  }

  // Store the password the invitee chose so the Global Admin can reveal it too.
  // set_by is the invitee's own email — it was self-chosen via the invite.
  await storeAdminPassword(created.user.id, password, invite.email);

  await logActivity({
    actorEmail: invite.email,
    // ActorRole is admin|global_admin; a read-only user acceptance logs as "admin"
    // (the audit actor tier), while a global-admin invite records "global_admin".
    actorRole: inviteRole === "global_admin" ? "global_admin" : "admin",
    action: "accept_admin_invite",
    recordTable: "auth.users",
    recordId: created.user.id,
    snapshot: { email: invite.email, name, invite_id: invite.id },
  });

  return NextResponse.json({ ok: true, email: invite.email }, { status: 201 });
}
