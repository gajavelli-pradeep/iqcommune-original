import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial edit of a session. Column names match the DB (snake_case). `.strict()`
// blocks unknown keys; TDS rate is cleared when TDS is turned off.
const EditSessionSchema = z
  .object({
    ref_code:       z.string().min(1),
    module:         z.string().min(1),
    practitioner_id: z.string().uuid(),
    session_date:   z.string().min(1),
    start_time:     z.string().min(1),
    end_time:       z.string().min(1),
    venue:          z.string().min(1),
    audience_type:  z.string().min(1),
    participants:   z.number().int().min(1),
    payout_amount:  z.number().int().min(1),
    tds_applicable: z.boolean(),
    tds_rate:       z.number().min(0).max(100).nullable(),
    consent_status: z.string().min(1),
    status:         z.string().min(1),
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

  const parsed = EditSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const patch = { ...parsed.data };
  if (patch.tds_applicable === false) patch.tds_rate = null;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const actorEmail = user?.email ?? "unknown";

  const db = createAdminClient();

  const { data: record } = await db
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "edit_session",
    recordTable: "sessions",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { data: updated, error } = await db
    .from("sessions")
    .update(patch)
    .eq("id", id)
    .select("*, practitioner:practitioners(name, email)")
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
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "delete_session",
    recordTable: "sessions",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  // Soft-delete: hide the row now, purge after the grace window (see 0016).
  const { error } = await db
    .from("sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
