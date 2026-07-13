import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { generateInviteToken, hashToken, buildInviteUrl, INVITE_TTL_DAYS, isExpired } from "@/lib/admin-invite";
import { getBaseUrl } from "@/lib/base-url";
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

  // Reject if this email already belongs to an existing account.
  const { data: userList } = await supabase.auth.admin.listUsers();
  const exists = (userList?.users ?? []).some((u) => u.email?.toLowerCase() === email);
  if (exists) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Reject a duplicate live invite (the partial-unique index also enforces this).
  const { data: live } = await supabase
    .from("admin_invites")
    .select("id, expires_at")
    .eq("email", email)
    .eq("status", "Pending")
    .maybeSingle();
  if (live && !isExpired(live.expires_at)) {
    return NextResponse.json({ error: "A pending invite for this email already exists" }, { status: 409 });
  }
  // A stale Pending row would collide with the unique index — expire it first.
  if (live) {
    await supabase.from("admin_invites").update({ status: "Expired" }).eq("id", live.id);
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
    log.error("Create admin invite failed", { error: error?.message });
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "create_admin_invite",
    recordTable: "admin_invites",
    recordId: data.id,
    snapshot: { email, role: parsed.data.role, expires_at: expiresAt },
  });

  return NextResponse.json(
    { data: data as InviteView, url: buildInviteUrl(token, getBaseUrl(req)) },
    { status: 201 }
  );
}
