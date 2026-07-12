import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encryptOptional } from "@/lib/encrypt";
import { TSHIRT_SIZES } from "@/lib/schemas/application";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const STATUSES = [
  "Applied",
  "Under Review",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
  "Rejected",
] as const;

// All fields optional — this is a partial edit. `.strict()` rejects unknown keys
// so a caller can't slip in bank/payment columns not intended for this form.
const EditPractitionerSchema = z
  .object({
    name:       z.string().min(1),
    email:      z.string().email(),
    role:       z.string().min(1),
    city:       z.string().min(1),
    experience: z.string().min(1),
    phone:      z.string().nullable(),
    org:        z.string().nullable(),
    modules:    z.array(z.string()),
    status:     z.enum(STATUSES),
    // V5 correctable intake fields.
    state:                 z.string().nullable(),
    communication_address: z.string().nullable(),
    tshirt_size:           z.enum(TSHIRT_SIZES).nullable(),
    // P2-2: payment correction. No payment_method/invoice_name columns exist —
    // method is implicit (UPI vs bank) and bank_name is the invoice/payee name.
    // Encrypted at rest below before the update is applied.
    upi_id:                z.string().nullable(),
    bank_name:             z.string().nullable(),
    bank_account:          z.string().nullable(),
    ifsc:                  z.string().nullable(),
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

  const parsed = EditPractitionerSchema.safeParse(json);
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
    .from("practitioners")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Snapshot prior state before mutating so the change is auditable / reversible.
  await logAdminAction({
    actorEmail,
    action: "edit_practitioner",
    recordTable: "practitioners",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  // Payment fields are stored encrypted (see app/api/applications/route.ts) and the
  // console decrypts on read — so any edited payment field must be re-encrypted here,
  // otherwise the correction would be persisted as plaintext at rest.
  const updatePayload = { ...parsed.data };
  if (updatePayload.upi_id !== undefined) updatePayload.upi_id = encryptOptional(updatePayload.upi_id);
  if (updatePayload.bank_name !== undefined) updatePayload.bank_name = encryptOptional(updatePayload.bank_name);
  if (updatePayload.bank_account !== undefined) updatePayload.bank_account = encryptOptional(updatePayload.bank_account);
  if (updatePayload.ifsc !== undefined) updatePayload.ifsc = encryptOptional(updatePayload.ifsc);

  const { data: updated, error } = await db
    .from("practitioners")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
    .from("practitioners")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // V5 §3.3/§5 stage gate: hard delete is allowed ONLY before there's empanelment
  // history — {Applied, Screening Done, Rejected}. Agreement Sent / Empanelled carry
  // agreement/session history and Deactivated is already parked, so they must be
  // deactivated (reversible), never hard-deleted.
  const DELETABLE_STATUSES = ["Applied", "Screening Done", "Rejected"];
  if (!DELETABLE_STATUSES.includes(record.status)) {
    return NextResponse.json(
      { error: "Deactivate instead of deleting a practitioner with history." },
      { status: 409 },
    );
  }

  await logAdminAction({
    actorEmail,
    action: "delete_practitioner",
    recordTable: "practitioners",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  // Soft-delete: hide the row now, purge after the grace window (see 0016).
  const { error } = await db
    .from("practitioners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
