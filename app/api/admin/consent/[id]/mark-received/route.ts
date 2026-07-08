import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: conf, error: fetchErr } = await supabase
    .from("confirmations")
    .select("id, status, session_id, ref_code")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !conf) {
    return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
  }
  if (conf.status !== "Awaiting consent") {
    return NextResponse.json({ error: "Confirmation is not awaiting consent" }, { status: 409 });
  }

  // Atomic: only the request that finds it still 'Awaiting consent' wins.
  const { data: updated, error: updErr } = await supabase
    .from("confirmations")
    .update({ status: "Consent received" })
    .eq("id", id)
    .eq("status", "Awaiting consent")
    .select("id, status")
    .maybeSingle();

  if (updErr) {
    log.error("Mark consent received failed", { error: updErr.message, id });
    return NextResponse.json({ error: "Failed to update confirmation" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Confirmation is not awaiting consent" }, { status: 409 });
  }

  // Flip the linked session's consent status.
  const { error: sessErr } = await supabase
    .from("sessions")
    .update({ consent_status: "Consent given" })
    .eq("id", conf.session_id);
  if (sessErr) {
    log.error("Failed to flip session consent_status after mark-received", { error: sessErr.message, sessionId: conf.session_id });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "mark_consent_received", recordTable: "confirmations", recordId: id,
      snapshot: { ref_code: conf.ref_code, before: { status: "Awaiting consent" }, after: { status: "Consent received" } },
    });
  }

  return NextResponse.json({ data: updated });
}
