import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { requireGlobalAdmin, getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";
import { storeAdminPassword } from "@/lib/admin-password-vault";
import { log } from "@/lib/logger";
import { GLOBAL_ADMIN_ROLE, USER_ROLE, isGlobalAdminRole, isUserRole } from "@/lib/supabase/roles";
import { z } from "zod";

// Collapse legacy/variant role strings to the three canonical values the UI uses.
function normalizeRole(role: unknown): "admin" | "global_admin" | "user" {
  if (isGlobalAdminRole(role)) return GLOBAL_ADMIN_ROLE;
  if (isUserRole(role)) return USER_ROLE;
  return "admin";
}

// D11: the roster is READ-able by any signed-in admin so the Team & Access table can
// render for every role (as the V6 mockup shows). The payload below is already
// display-only — id/email/role/gallery flag/last-sign-in, no hashes or tokens. Every
// mutation on this route stays `requireGlobalAdmin`.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    log.error("SA list users failed", { error: error.message });
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }

  // Return only console users (admin / global-admin / read-only user) — strip
  // sensitive fields. Legacy "super_admin" accounts normalise to "global_admin".
  const adminUsers = (data.users ?? [])
    .filter((u) => {
      const role = u.app_metadata?.role;
      return role === "admin" || isGlobalAdminRole(role) || isUserRole(role);
    })
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: normalizeRole(u.app_metadata?.role),
      gallery_access: u.app_metadata?.gallery_access === true,
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at,
    }));

  return NextResponse.json({ data: adminUsers });
}

const CreateSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role:     z.enum(["admin", "global_admin", "user"]).default("admin"),
});

export async function POST(req: NextRequest) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, role } = body.data;
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });

  if (error || !data.user) {
    // Supabase returns 422 when the email is already registered.
    const already = error?.status === 422 || /already/i.test(error?.message ?? "");
    log.error("SA create admin failed", { error: error?.message });
    return NextResponse.json(
      { error: already ? "A user with this email already exists" : "Failed to create admin" },
      { status: already ? 409 : 500 }
    );
  }

  const actor = await getGlobalAdminUser();
  // Store the SA-chosen password (encrypted) so it can be revealed/copied later.
  await storeAdminPassword(data.user.id, password, actor?.email ?? "unknown");

  await logAdminAction({
    actorEmail: actor?.email ?? "unknown",
    action: "create_admin",
    recordTable: "auth.users",
    recordId: data.user.id,
    snapshot: { email, role },
  });

  const u = data.user;
  return NextResponse.json(
    {
      data: {
        id: u.id,
        email: u.email,
        role: (u.app_metadata?.role as string) ?? role,
        gallery_access: u.app_metadata?.gallery_access === true,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      },
    },
    { status: 201 }
  );
}
