import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const REQUEST_STATUSES = ["New", "Matched", "Confirmed", "Completed", "Cancelled"] as const;

// Partial edit of a session request. `.strict()` blocks unknown keys (e.g. the
// legal spoc_declaration / assigned_to fields, which are managed elsewhere).
const EditRequestSchema = z
  .object({
    name:            z.string().min(1),
    email:           z.string().email(),
    phone:           z.string().nullable(),
    org:             z.string().nullable(),
    city:            z.string().nullable(),
    state:           z.string().nullable(),
    topic:           z.string().min(1),
    audience_type:   z.string().min(1),
    group_size:      z.string().nullable(),
    min_commit:      z.number().int().nullable(),
    venue:           z.string().nullable(),
    preferred_dates: z.string().nullable(),
    notes:           z.string().nullable(),
    status:          z.enum(REQUEST_STATUSES),
  })
  .partial()
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireGlobalAdmin();
  if (deny) return deny;

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EditRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const actorEmail = user?.email ?? "unknown";

  const db = createAdminClient();

  const { data: record } = await db
    .from("session_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "edit_session_request",
    recordTable: "session_requests",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { data: updated, error } = await db
    .from("session_requests")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await requireGlobalAdmin();
  if (deny) return deny;

  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const actorEmail = user?.email ?? "unknown";

  const db = createAdminClient();

  const { data: record } = await db
    .from("session_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "delete_session_request",
    recordTable: "session_requests",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  // Soft-delete: hide the row now, purge after the grace window (see 0016).
  const { error } = await db
    .from("session_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
