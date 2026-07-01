import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/super-admin-audit";
import { log } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, ref_code, module, practitioner_id, payout_amount, tds_applicable, tds_rate, status")
    .eq("id", id)
    .single();

  if (fetchErr || !session) {
    log.error("Create payout: session not found", { sessionId: id, error: fetchErr?.message });
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "Completed") {
    return NextResponse.json(
      { error: "Payout can only be created for Completed sessions" },
      { status: 409 }
    );
  }

  const { data: existing } = await supabase
    .from("payouts")
    .select("id")
    .eq("session_id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Payout already exists for this session" }, { status: 409 });
  }

  const gross = session.payout_amount as number;
  const tdsRate =
    session.tds_applicable && session.tds_rate ? (session.tds_rate as number) : 0;
  const tdsAmount = Math.round((gross * tdsRate) / 100);
  const net = gross - tdsAmount;

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const invoiceRef = `INV-${session.ref_code}-${ym}`;

  const { data: payout, error: insertErr } = await supabase
    .from("payouts")
    .insert({
      session_id: id,
      practitioner_id: session.practitioner_id as string,
      invoice_ref: invoiceRef,
      gross_amount: gross,
      net_amount: net,
      tds_rate: tdsRate > 0 ? tdsRate : null,
      status: "Pending",
    })
    .select("id, invoice_ref, gross_amount, net_amount")
    .single();

  if (insertErr) {
    log.error("Create payout: insert failed", { error: insertErr.message, sessionId: id });
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }

  log.info("Payout created", {
    payoutId: payout.id,
    sessionId: id,
    invoiceRef,
    gross,
    net,
  });

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "create_payout", recordTable: "payouts", recordId: payout.id,
      snapshot: { invoice_ref: invoiceRef, session_ref: session.ref_code, after: { status: "Pending", gross, net } },
    });
  }
  return NextResponse.json({ data: payout }, { status: 201 });
}
