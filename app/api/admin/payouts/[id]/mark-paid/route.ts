import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/super-admin-audit";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email/brevo";
import { payoutPaid } from "@/lib/email/templates";
import { guardEmailSend } from "@/lib/email/idempotency";
import { z } from "zod";

const Body = z.object({
  paidOn:         z.string().min(1),
  payment_method: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "paidOn (ISO date) is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: payout, error: fetchErr } = await supabase
    .from("payouts")
    .select("id, status, practitioner_id, invoice_ref, gross_amount, net_amount")
    .eq("id", id)
    .single();

  if (fetchErr || !payout) {
    log.error("Payout fetch failed", { error: fetchErr?.message, payoutId: id });
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }
  if (payout.status === "Paid") {
    return NextResponse.json({ error: "Payout already marked paid" }, { status: 409 });
  }

  const { error: updateErr } = await supabase
    .from("payouts")
    .update({
      status: "Paid",
      paid_at: body.data.paidOn,
      ...(body.data.payment_method ? { payment_method: body.data.payment_method } : {}),
    })
    .eq("id", id)
    .eq("status", "Pending");

  if (updateErr) {
    log.error("Payout mark-paid update failed", { error: updateErr.message, payoutId: id });
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }

  log.info("Payout marked paid", { payoutId: id, paidOn: body.data.paidOn, practitionerId: payout.practitioner_id });

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "mark_payout_paid", recordTable: "payouts", recordId: id,
      snapshot: { invoice_ref: payout.invoice_ref, before: { status: payout.status }, after: { status: "Paid", paid_at: body.data.paidOn } },
    });
  }

  // Notify practitioner (idempotent)
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("name, email")
    .eq("id", payout.practitioner_id)
    .single();

  if (practitioner?.email) {
    const alreadySent = await guardEmailSend("payout_paid", id, practitioner.email as string);
    if (!alreadySent) {
      try {
        const { subject, htmlContent } = payoutPaid({
          practitionerName: practitioner.name as string,
          invoiceRef:       payout.invoice_ref as string ?? id,
          // Practitioner is paid the NET amount (gross − TDS), not gross.
          amountInr:        (payout.net_amount as number) ?? (payout.gross_amount as number) ?? 0,
        });
        await sendEmail({ to: practitioner.email as string, name: practitioner.name as string, subject, htmlContent });
      } catch (emailErr) {
        log.error("Payout paid email failed", { error: String(emailErr), payoutId: id });
      }
    }
  }

  return new NextResponse(null, { status: 204 });
}
