import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { ReassignConsentSchema } from "@/lib/schemas/consent";
import { generateConfirmationForSession } from "@/lib/consent-generate";
import { getBaseUrl } from "@/lib/base-url";

export const dynamic = "force-dynamic";

/**
 * Replace the practitioner on an Upcoming session (Global Admin only).
 *
 * Ordered cascade — the same primitive V4's `Superseded` status was designed for:
 *   1. supersede the active confirmation (X's consent is voided, kept for audit)
 *   2. move the session to Y + reset consent_status → 'Pending consent'
 *   3. keep the originating request's assignee consistent
 *   4. re-drive consent: generate a fresh confirmation for Y (new link/PDF/email)
 *   5. audit the reassignment
 *
 * Supersede precedes the new insert so the one-active-confirmation unique index is
 * always satisfied; each write is a service-role statement, matching every other
 * write path in this app (no cross-statement transaction needed — the index is the
 * hard integrity guard, and a mid-cascade failure leaves a recoverable state).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const { id: sessionId } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReassignConsentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { newPractitionerId, reason, gross, tdsRate, gstRate, startTime, duration } = parsed.data;

  const supabase = createAdminClient();

  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .select("id, ref_code, status, consent_status, practitioner_id, request_id")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .single();

  if (sessErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "Upcoming") {
    return NextResponse.json({ error: "Only an upcoming session can be reassigned" }, { status: 409 });
  }
  if (session.practitioner_id === newPractitionerId) {
    return NextResponse.json({ error: "Choose a different practitioner" }, { status: 400 });
  }

  // The replacement must be an empanelled practitioner (Active agreement).
  const { data: newPract, error: practErr } = await supabase
    .from("practitioners")
    .select("id, name, status")
    .eq("id", newPractitionerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (practErr || !newPract) {
    return NextResponse.json({ error: "Replacement practitioner not found" }, { status: 404 });
  }
  if (newPract.status !== "Empanelled") {
    return NextResponse.json({ error: "Replacement must be an empanelled practitioner" }, { status: 422 });
  }

  const actor = await getAdminUser();
  const fromPractitionerId = session.practitioner_id;

  // 1. Supersede the active confirmation (if one exists) — captures its ref for audit.
  const { data: superseded, error: supErr } = await supabase
    .from("confirmations")
    .update({ status: "Superseded" })
    .eq("session_id", sessionId)
    .neq("status", "Superseded")
    .is("deleted_at", null)
    .select("id, ref_code");
  if (supErr) {
    log.error("Reassign: supersede failed", { error: supErr.message, sessionId });
    return NextResponse.json({ error: "Failed to supersede the existing confirmation" }, { status: 500 });
  }

  // 2. Move the session to the new practitioner + reset consent so Y must re-consent.
  const { error: moveErr } = await supabase
    .from("sessions")
    .update({ practitioner_id: newPractitionerId, consent_status: "Pending consent" })
    .eq("id", sessionId);
  if (moveErr) {
    log.error("Reassign: session move failed", { error: moveErr.message, sessionId });
    return NextResponse.json({ error: "Failed to reassign the session" }, { status: 500 });
  }

  // 3. Keep the originating request's assignee consistent (UI stays read-only).
  if (session.request_id) {
    const { error: reqErr } = await supabase
      .from("session_requests")
      .update({ assigned_to: newPractitionerId })
      .eq("id", session.request_id);
    if (reqErr) log.error("Reassign: request assignee update failed (non-fatal)", { error: reqErr.message, requestId: session.request_id });
  }

  // 4. Re-drive consent for Y — fresh confirmation, link, PDF, email.
  const gen = await generateConfirmationForSession({
    sessionId, gross, tdsRate, gstRate, startTime, duration,
    baseUrl: getBaseUrl(req), actor,
  });
  if (!gen.ok) {
    // Session is superseded + moved but the new confirmation didn't generate — a
    // Generate-consent retry from the console recovers it. Surface the reason.
    log.error("Reassign: confirmation generation failed after cascade", { error: gen.error, sessionId });
    return NextResponse.json(
      { error: `Session reassigned, but generating the new confirmation failed: ${gen.error}. Use "Generate consent" to retry.` },
      { status: 500 }
    );
  }

  // 5. Audit the reassignment.
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "reassign_session", recordTable: "sessions", recordId: sessionId,
      snapshot: {
        session_ref: session.ref_code, reason,
        from_practitioner_id: fromPractitionerId, to_practitioner_id: newPractitionerId,
        superseded_confirmation_refs: (superseded ?? []).map((c) => c.ref_code),
        new_confirmation_ref: gen.ref_code,
      },
    });
  }

  // Return the full new confirmation row (with practitioner join) so the console can
  // prepend it and flip the superseded row locally.
  const { data: newRow } = await supabase
    .from("confirmations")
    .select("*, practitioner:practitioners(name, email)")
    .eq("id", gen.id)
    .single();

  return NextResponse.json(
    {
      data: {
        confirmation: newRow,
        supersededIds: (superseded ?? []).map((c) => c.id),
        consent_link: gen.consent_link,
        newPractitionerId,
      },
    },
    { status: 201 }
  );
}
