import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

// Inline edit of the manual payout fields on a Pending row (Pay to / Method /
// Invoice ref.). Any admin may fill these while the payout is Pending; once Paid
// the row is frozen and corrections go through the Global-Admin edit modal.
// payment_method is a free string (dropdown default + "Other" escape), so it is
// validated as a bounded string rather than an enum. (Marking a payout paid is a
// separate endpoint: /api/admin/payouts/[id]/mark-paid.)
const EditFieldsSchema = z
  .object({
    pay_to:         z.string().trim().min(1).max(120).nullable(),
    payment_method: z.string().trim().min(1).max(40).nullable(),
    invoice_ref:    z.string().trim().min(1).max(60),
  })
  .partial()
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EditFieldsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: record, error: fetchErr } = await db
    .from("payouts")
    .select("id, status, invoice_ref, pay_to, payment_method")
    .eq("id", id)
    .single();

  if (fetchErr || !record) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }
  // These are payment inputs — editable only before the row is marked paid.
  if (record.status !== "Pending") {
    return NextResponse.json(
      { error: "This payout is already paid — edit it from the Global Admin edit dialog." },
      { status: 409 },
    );
  }

  // Invoice refs stay unique among live rows (a DB partial-unique index backs this
  // too; the pre-check gives a friendly message instead of a raw 23505).
  if (parsed.data.invoice_ref && parsed.data.invoice_ref !== record.invoice_ref) {
    const { data: clash } = await db
      .from("payouts")
      .select("id")
      .eq("invoice_ref", parsed.data.invoice_ref)
      .is("deleted_at", null)
      .neq("id", id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: "That invoice reference is already in use." }, { status: 409 });
    }
  }

  const patch: Database["public"]["Tables"]["payouts"]["Update"] = { ...parsed.data };

  const { data: updated, error } = await db
    .from("payouts")
    .update(patch)
    .eq("id", id)
    .eq("status", "Pending")
    .select("id, pay_to, payment_method, invoice_ref")
    .single();

  if (error || !updated) {
    // 23505 = unique_violation (the invoice_ref index) racing the pre-check above.
    const isDup = (error as { code?: string } | null)?.code === "23505";
    log.error("Payout inline edit failed", { error: error?.message, payoutId: id });
    return NextResponse.json(
      { error: isDup ? "That invoice reference is already in use." : "Failed to update payout" },
      { status: isDup ? 409 : 500 },
    );
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "edit_payout",
      recordTable: "payouts",
      recordId: id,
      snapshot: {
        invoice_ref: record.invoice_ref,
        before: { pay_to: record.pay_to, payment_method: record.payment_method, invoice_ref: record.invoice_ref },
        after: parsed.data,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
