import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

// Reverses a one-click Assign (the V5 instant-undo target). Soft-deletes the
// just-created session and resets the request to New/unassigned, atomically and
// with no client email. Deliberately narrow: it only fires for a *fresh*
// assignment — a session still Upcoming, still Pending consent, with no
// confirmation generated yet. Once consent exists the assignment has real
// downstream state and must be unwound via Cancel, not silently undone.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: request, error: rErr } = await supabase
    .from("session_requests")
    .select("id, status, assigned_to")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (rErr || !request) {
    return NextResponse.json({ error: "Session request not found" }, { status: 404 });
  }
  if (request.status !== "Confirmed") {
    return NextResponse.json({ error: "Only a Confirmed request can be unassigned" }, { status: 409 });
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, status, consent_status")
    .eq("request_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (sErr) {
    log.error("Unassign: session lookup failed", { error: sErr.message, requestId: id });
    return NextResponse.json({ error: "Could not undo the assignment" }, { status: 500 });
  }
  if (session) {
    if (session.status !== "Upcoming" || session.consent_status !== "Pending consent") {
      return NextResponse.json(
        { error: "This session has progressed past assignment — cancel it instead of undoing." },
        { status: 409 }
      );
    }
    // A generated confirmation means consent is in flight — no longer a safe undo.
    const { count: confCount } = await supabase
      .from("confirmations")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id);
    if (confCount && confCount > 0) {
      return NextResponse.json(
        { error: "A confirmation already exists for this session — cancel it instead of undoing." },
        { status: 409 }
      );
    }

    const { error: delErr } = await supabase
      .from("sessions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", session.id);
    if (delErr) {
      log.error("Unassign: session soft-delete failed", { error: delErr.message, sessionId: session.id });
      return NextResponse.json({ error: "Could not undo the assignment" }, { status: 500 });
    }
  }

  const { error: uErr } = await supabase
    .from("session_requests")
    .update({ status: "New", assigned_to: null })
    .eq("id", id);
  if (uErr) {
    log.error("Unassign: request reset failed", { error: uErr.message, requestId: id });
    return NextResponse.json({ error: "Session removed but resetting the request failed" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "unassign_practitioner", recordTable: "session_requests", recordId: id,
      snapshot: { before: { status: "Confirmed", assigned_to: request.assigned_to }, after: { status: "New" } },
    });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
