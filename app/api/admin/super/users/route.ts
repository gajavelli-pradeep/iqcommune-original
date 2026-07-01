import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, getSuperAdminUser } from "@/lib/supabase/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

export async function GET() {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    log.error("SA list users failed", { error: error.message });
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }

  // Return only admin/super_admin users — strip sensitive fields
  const adminUsers = (data.users ?? [])
    .filter((u) => {
      const role = u.app_metadata?.role;
      return role === "admin" || role === "super_admin";
    })
    .map((u) => ({
      id: u.id,
      email: u.email,
      role: u.app_metadata?.role ?? "admin",
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at,
    }));

  return NextResponse.json({ data: adminUsers });
}

const CreateSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role:     z.enum(["admin", "super_admin"]).default("admin"),
});

export async function POST(req: NextRequest) {
  const denied = await requireSuperAdmin();
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

  const actor = await getSuperAdminUser();
  await logSuperAdminAction({
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
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      },
    },
    { status: 201 }
  );
}
