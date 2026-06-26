import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let payment_method = "UPI";
  try {
    const body = await req.json();
    if (typeof body?.payment_method === "string" && body.payment_method) {
      payment_method = body.payment_method;
    }
  } catch {
    // no body — default to UPI
  }

  const db = createAdminClient();

  const { data: payout, error: fetchErr } = await db
    .from("payouts")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchErr) {
    log.error("Payout fetch failed", { error: fetchErr.message, payoutId: id });
    return NextResponse.json({ error: "Failed to fetch payout" }, { status: 500 });
  }
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  if (payout.status !== "Pending") {
    return NextResponse.json({ error: "Payout already paid" }, { status: 409 });
  }

  // Atomic update: WHERE status = 'Pending' prevents a concurrent mark-paid from
  // causing a silent double-update even if two requests pass the status check above.
  const { data: updated, error } = await db
    .from("payouts")
    .update({ status: "Paid", paid_at: new Date().toISOString(), payment_method })
    .eq("id", id)
    .eq("status", "Pending")
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Payout PATCH failed", { error: error.message, payoutId: id });
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Payout already paid" }, { status: 409 });
  }
  return new NextResponse(null, { status: 204 });
}
