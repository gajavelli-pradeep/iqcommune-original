import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Partial edit of an agreement. `status` is left as a free string — the DB CHECK
// constraint is the source of truth for valid states, so we don't duplicate it
// here (and risk rejecting a value the DB would accept). Sensitive signature
// columns (signature_data / signer_ip / storage_path) are intentionally excluded.
const EditAgreementSchema = z
  .object({
    ref_code:         z.string().min(1),
    module:           z.string().min(1),
    status:           z.string().min(1),
    signature_method: z.string().nullable(),
    signed_at:        z.string().nullable(),
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

  const parsed = EditAgreementSchema.safeParse(json);
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
    .from("agreements")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "edit_agreement",
    recordTable: "agreements",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { data: updated, error } = await db
    .from("agreements")
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
    .from("agreements")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAdminAction({
    actorEmail,
    action: "delete_agreement",
    recordTable: "agreements",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  // Soft-delete: hide the row now, purge after the grace window (see 0016).
  const { error } = await db
    .from("agreements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
