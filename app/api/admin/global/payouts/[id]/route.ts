import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { logAdminAction } from "@/lib/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

const PAYOUT_STATUSES = ["Pending", "Paid"] as const;
const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;

// Partial edit of a payout. net_amount is derived (never client-trusted) — the
// route recomputes it from the effective gross + TDS rate so the ledger stays
// internally consistent. The session/practitioner linkage is immutable here.
const EditPayoutSchema = z
  .object({
    invoice_ref:    z.string().min(1),
    gross_amount:   z.number().int().min(1),
    tds_rate:       z.number().min(0).max(100).nullable(),
    payment_method: z.enum(PAYMENT_METHODS).nullable(),
    status:         z.enum(PAYOUT_STATUSES),
    paid_at:        z.string().nullable(),
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

  const parsed = EditPayoutSchema.safeParse(json);
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
    .from("payouts")
    .select("*")
    .eq("id", id)
    .single();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Database["public"]["Tables"]["payouts"]["Update"] = { ...parsed.data };

  // Recompute net whenever gross or TDS changes, using existing values as the base.
  if ("gross_amount" in parsed.data || "tds_rate" in parsed.data) {
    const gross = parsed.data.gross_amount ?? record.gross_amount;
    const tds = (parsed.data.tds_rate !== undefined ? parsed.data.tds_rate : record.tds_rate) ?? 0;
    patch.net_amount = Math.round(gross - (gross * tds) / 100);
  }

  await logAdminAction({
    actorEmail,
    action: "edit_payout",
    recordTable: "payouts",
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { data: updated, error } = await db
    .from("payouts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: updated });
}

// V5 P2-7: payouts are permanent financial records — deletion is disabled by
// design (spec: "no delete button anywhere, ever"). Corrections go through Revert
// (setting a Paid payout back to Pending via the edit modal), never deletion.
export async function DELETE() {
  return NextResponse.json(
    { error: "Payouts cannot be deleted — revert the payout instead." },
    { status: 405 },
  );
}
