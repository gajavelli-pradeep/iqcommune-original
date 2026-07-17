import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/brevo";
import { payoutReminderEmail } from "@/lib/email/templates";
import { formatInr } from "@/lib/tds";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

/**
 * Email a payout reminder to the practitioner.
 *
 * Sends the same content the "Draft reminder" modal shows. Re-sendable by design
 * (a reminder), so no send-once guard — the client's in-flight disable prevents
 * double-clicks and every attempt is audited. The recipient address is resolved
 * server-side from the payout, never supplied by the client.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: payout, error } = await supabase
    .from("payouts")
    .select("id, invoice_ref, net_amount, practitioner_id, session_id")
    .eq("id", id)
    .single();

  if (error || !payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  const { data: practitioner, error: pErr } = await supabase
    .from("practitioners")
    .select("name, email")
    .eq("id", payout.practitioner_id)
    .single();

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }
  if (!practitioner.email) {
    return NextResponse.json({ error: "No email address on file for this practitioner." }, { status: 409 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("module")
    .eq("id", payout.session_id)
    .single();

  const { subject, htmlContent } = payoutReminderEmail(practitioner.name ?? "", {
    invoiceRef: payout.invoice_ref,
    netAmount: formatInr(payout.net_amount),
    module: session?.module ?? "",
  });

  try {
    const { messageId } = await sendEmail({ to: practitioner.email, name: practitioner.name ?? undefined, subject, htmlContent });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: "admin",
      action: "send_payout_reminder",
      recordTable: "payouts",
      recordId: id,
      snapshot: { to: practitioner.email, messageId },
    });
    return NextResponse.json({ ok: true, sentTo: practitioner.email });
  } catch (err) {
    log.error("Payout reminder send failed", { error: (err as Error).message, payoutId: id });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: "admin",
      action: "send_payout_reminder_failed",
      recordTable: "payouts",
      recordId: id,
      snapshot: { to: practitioner.email, error: (err as Error).message },
    });
    return NextResponse.json(
      { error: "Couldn't send the email automatically. Copy the draft and send it manually instead." },
      { status: 502 },
    );
  }
}
