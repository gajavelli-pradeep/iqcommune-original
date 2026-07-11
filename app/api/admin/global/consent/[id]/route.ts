import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const OverrideSchema = z.object({
  status: z.enum(["Awaiting consent", "Consent received", "Superseded"]),
});

// The session's consent_status follows the confirmation's status.
function sessionConsentFor(status: string): "Consent given" | "Pending consent" {
  return status === "Consent received" ? "Consent given" : "Pending consent";
}

/**
 * Global-Admin status override for a confirmation. The single writer of the
 * confirmation status from the console: sets any of the three states directly and
 * cascades the linked session's consent_status. Replaces the earlier one-off
 * supersede endpoint (superseding is now just an override to 'Superseded').
 *
 * Gated to Upcoming sessions — a Completed/Cancelled session's confirmation is a
 * historical record, not re-openable. Re-activating a superseded row while another
 * active confirmation exists is blocked by the one-active-per-session unique index
 * (surfaced as a 409, not a 500).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = OverrideSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { status } = parsed.data;

  const supabase = createAdminClient();

  const { data: conf, error: fetchErr } = await supabase
    .from("confirmations")
    .select("id, status, session_id, ref_code, session:sessions(status)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !conf) {
    return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
  }
  const sessionStatus = Array.isArray(conf.session) ? conf.session[0]?.status : conf.session?.status;
  if (sessionStatus !== "Upcoming") {
    return NextResponse.json({ error: "Only a confirmation on an upcoming session can be changed" }, { status: 409 });
  }
  if (conf.status === status) {
    return NextResponse.json({ data: { id, status, session_id: conf.session_id } });
  }

  const { data: updated, error: updErr } = await supabase
    .from("confirmations")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updErr) {
    // Reactivating a superseded row when another active confirmation exists.
    if (updErr.code === "23505") {
      return NextResponse.json(
        { error: "Another active confirmation already exists for this session — supersede it first." },
        { status: 409 }
      );
    }
    log.error("Consent status override failed", { error: updErr.message, id, status });
    return NextResponse.json({ error: "Failed to update the status" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
  }

  const consent = sessionConsentFor(status);
  const { error: sessErr } = await supabase
    .from("sessions")
    .update({ consent_status: consent })
    .eq("id", conf.session_id);
  if (sessErr) {
    log.error("Failed to sync session consent_status after override", { error: sessErr.message, sessionId: conf.session_id });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "override_consent_status", recordTable: "confirmations", recordId: id,
      snapshot: { ref_code: conf.ref_code, before: { status: conf.status }, after: { status } },
    });
  }

  return NextResponse.json({ data: { id, status, session_id: conf.session_id, session_consent_status: consent } });
}
