import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverConfirmationEmail } from "@/lib/email/deliver-confirmation-email";
import { logActivity } from "@/lib/admin-audit";

// Snapshot fields captured at generation time (lib/consent-generate.ts) — enough to
// rebuild the consent email without re-reading the live session.
interface ConfirmationSnapshot {
  practitionerName?: string;
  module?: string;
  date?: string;
  startTime?: string;
  time?: string; // "10:00 AM – 1:00 PM"
  venue?: string;
  participants?: number;
  gross?: number;
  tdsRate?: number;
  tdsAmount?: number;
  net?: number;
}

// Resend the consent email for a confirmation still awaiting consent — the manual
// recovery when the original Brevo send failed/bounced (or the admin wants to nudge).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: conf, error } = await supabase
    .from("confirmations")
    .select("id, ref_code, status, snapshot, consent_link, practitioner:practitioners(name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !conf) {
    return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
  }
  if (conf.status !== "Awaiting consent") {
    return NextResponse.json({ error: "Confirmation is not awaiting consent" }, { status: 409 });
  }
  if (!conf.consent_link) {
    return NextResponse.json({ error: "No consent link on this confirmation" }, { status: 409 });
  }

  const practitioner = Array.isArray(conf.practitioner) ? conf.practitioner[0] : conf.practitioner;
  const snap = (conf.snapshot ?? {}) as ConfirmationSnapshot;
  // endTime isn't stored discretely — recover it from the combined display time.
  const endTime = String(snap.time ?? "").split(/[–-]/)[1]?.trim() ?? "";

  const outcome = await deliverConfirmationEmail({
    confirmationId: conf.id,
    practitionerName: practitioner?.name ?? snap.practitionerName ?? "Practitioner",
    practitionerEmail: practitioner?.email ?? null,
    fields: {
      refCode: conf.ref_code,
      module: snap.module ?? "",
      date: snap.date ?? "",
      startTime: snap.startTime ?? "",
      endTime,
      venue: snap.venue ?? "",
      participants: snap.participants ?? 0,
      grossAmount: snap.gross ?? 0,
      tdsAmount: snap.tdsAmount ?? 0,
      netAmount: snap.net ?? 0,
      tdsRate: snap.tdsRate ?? 0,
      consentUrl: conf.consent_link,
    },
    force: true,
  });

  await supabase
    .from("confirmations")
    .update({
      email_status: outcome,
      email_last_attempt_at: outcome === "no_email" ? null : new Date().toISOString(),
    })
    .eq("id", conf.id);

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "resend_consent_email", recordTable: "confirmations", recordId: conf.id,
      snapshot: { ref_code: conf.ref_code, email_status: outcome },
    });
  }

  if (outcome === "failed") {
    return NextResponse.json({ error: "Email send failed again — check the practitioner's address or send the link manually.", data: { emailStatus: outcome } }, { status: 502 });
  }
  return NextResponse.json({ data: { emailStatus: outcome } });
}
