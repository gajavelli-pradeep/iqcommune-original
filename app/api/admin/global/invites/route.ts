import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { generateInviteToken, hashToken, buildInviteUrl, INVITE_TTL_DAYS, isExpired } from "@/lib/admin-invite";
import { getBaseUrl } from "@/lib/base-url";
import { sendEmail } from "@/lib/email/brevo";
import { adminInviteEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend, recordEmailMessageId } from "@/lib/email/idempotency";
import { resolveDbError, PG_CODE } from "@/lib/db-error";
import { roleLabel } from "@/lib/supabase/roles";
import { log } from "@/lib/logger";
import { z } from "zod";

type InviteView = {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

// Pending invites past expiry are surfaced as "Expired" without a write —
// the daily state doesn't need a cron; read-time derivation is enough.
function withDerivedStatus(row: InviteView): InviteView {
  if (row.status === "Pending" && isExpired(row.expires_at)) {
    return { ...row, status: "Expired" };
  }
  return row;
}

export async function GET() {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("admin_invites")
    .select("id, email, role, status, invited_by, created_at, expires_at, accepted_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    log.error("List admin invites failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }

  return NextResponse.json({ data: (data as InviteView[]).map(withDerivedStatus) });
}

// V5 parity (client-mandated, informed sign-off): the Settings invite provisions
// an Admin, a read-only User, or a Global Admin. Only an authenticated global
// admin can reach this endpoint (requireGlobalAdmin below), and every invite is
// single-use, 7-day-expiring, SHA-256-hashed, rate-limited on accept, and
// audit-logged. A Global-Admin invite therefore grants full access to whoever
// opens the link — the UI warns on that selection; share only over secure channels.
const INVITE_ROLES = ["admin", "user", "global_admin"] as const;
const CreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(INVITE_ROLES).default("admin"),
});

export async function POST(req: NextRequest) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const supabase = createAdminClient();

  // Reject if this email already belongs to an existing account. A failed lookup
  // must NOT fall through: `data` would be null, `exists` false, and we'd invite an
  // email that already has an account — failing open on the very check this guards.
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr || !userList) {
    log.error("Create admin invite — account lookup failed", { error: listErr?.message });
    return NextResponse.json(
      { error: "Couldn't verify whether this email already has an account. Try again." },
      { status: 503 }
    );
  }
  const exists = userList.users.some((u) => u.email?.toLowerCase() === email);
  if (exists) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Reject a duplicate live invite (the partial-unique index also enforces this).
  // Same reasoning: a query error here is not "no pending invite".
  const { data: live, error: liveErr } = await supabase
    .from("admin_invites")
    .select("id, expires_at")
    .eq("email", email)
    .eq("status", "Pending")
    .maybeSingle();
  if (liveErr) {
    log.error("Create admin invite — pending-invite lookup failed", { code: liveErr.code, error: liveErr.message });
    return NextResponse.json(
      { error: "Couldn't check for an existing invite. Try again." },
      { status: 503 }
    );
  }
  if (live && !isExpired(live.expires_at)) {
    return NextResponse.json({ error: "A pending invite for this email already exists" }, { status: 409 });
  }
  // A stale Pending row would collide with the unique index — expire it first. If
  // this fails, the insert below hits 23505 and reports a duplicate that the admin
  // can't see; surface it here instead, where the cause is still known.
  if (live) {
    const { error: expireErr } = await supabase
      .from("admin_invites")
      .update({ status: "Expired" })
      .eq("id", live.id);
    if (expireErr) {
      log.error("Create admin invite — expiring stale invite failed", { code: expireErr.code, error: expireErr.message, inviteId: live.id });
      return NextResponse.json(
        { error: "Couldn't clear the previous invite for this email. Try again." },
        { status: 503 }
      );
    }
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const actor = await getGlobalAdminUser();

  const { data, error } = await supabase
    .from("admin_invites")
    .insert({
      email,
      role: parsed.data.role,
      token_hash: hashToken(token),
      invited_by: actor?.email ?? "unknown",
      expires_at: expiresAt,
    })
    .select("id, email, role, status, invited_by, created_at, expires_at, accepted_at")
    .single();

  if (error || !data) {
    const { message, status } = resolveDbError({
      op: "Create admin invite",
      error,
      fallback: "Failed to create invite",
      byCode: {
        // The DB is the final authority on which roles are invitable; if it and
        // INVITE_ROLES ever drift again, say so instead of a bare 500.
        [PG_CODE.CHECK_VIOLATION]: `The database rejected the "${parsed.data.role}" role. It may not be enabled yet — contact support.`,
        [PG_CODE.UNIQUE_VIOLATION]: "A pending invite for this email already exists.",
      },
      ctx: { role: parsed.data.role },
    });
    return NextResponse.json({ error: message }, { status });
  }

  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "create_admin_invite",
    recordTable: "admin_invites",
    recordId: data.id,
    snapshot: { email, role: parsed.data.role, expires_at: expiresAt },
  });

  const inviteUrl = buildInviteUrl(token, getBaseUrl(req));

  // Email the invite (best-effort, idempotent). The admin can also copy the link
  // or open it in their own mail app — so a failed send never blocks the invite.
  //
  // "queued", never "sent": Brevo's 2xx only means the message was accepted for
  // delivery. A rejected sender, a blocked contact, or a bounce is reported
  // asynchronously (delivery webhook) and never appears in this response — so
  // claiming "sent" here would assert a delivery we cannot observe. The copy-link
  // fallback stays the reliable path.
  let emailStatus: "queued" | "failed" = "failed";
  const alreadyQueued = await guardEmailSend("admin_invite", data.id, email);
  if (alreadyQueued) {
    emailStatus = "queued";
  } else {
    try {
      const { subject, htmlContent } = adminInviteEmail({
        inviteUrl,
        roleLabel: roleLabel(parsed.data.role),
        ttlDays: INVITE_TTL_DAYS,
      });
      const { messageId } = await sendEmail({ to: email, subject, htmlContent });
      await recordEmailMessageId("admin_invite", data.id, messageId);
      emailStatus = "queued";
    } catch (emailErr) {
      log.error("Admin invite email failed — revoking sentinel so it can retry", { error: String(emailErr), inviteId: data.id });
      await revokeEmailSend("admin_invite", data.id);
    }
  }

  return NextResponse.json(
    { data: data as InviteView, url: inviteUrl, email, emailStatus },
    { status: 201 }
  );
}
