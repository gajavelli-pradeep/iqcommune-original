import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

// V4 §4.2: one-click Assign — create the session, mark it awaiting consent, and
// flip the request to Confirmed (read-only). Payout + date are captured in the
// Assign dialog; start time/duration are entered later in Session Consent.
const Body = z.object({
  practitionerId: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
  payoutAmount: z.number().int().min(0),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  venue: z.string().trim().min(1).optional(),
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
    return NextResponse.json(
      { error: "practitionerId, payoutAmount and sessionDate are required", details: body.error.flatten() },
      { status: 400 }
    );
  }
  const { practitionerId, payoutAmount, sessionDate, venue } = body.data;
  const supabase = createAdminClient();

  const { data: practitioner, error: pErr } = await supabase
    .from("practitioners")
    .select("name")
    .eq("id", practitionerId)
    .single();
  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const { data: request, error: rErr } = await supabase
    .from("session_requests")
    .select("id, status, topic, audience_type, min_commit, venue")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (rErr || !request) {
    return NextResponse.json({ error: "Session request not found" }, { status: 404 });
  }
  if (request.status === "Confirmed") {
    return NextResponse.json({ error: "This request is already confirmed" }, { status: 409 });
  }

  // Next IQC-SES-#### ref (server-side; admin-rate so race risk is negligible).
  const { data: last } = await supabase
    .from("sessions")
    .select("ref_code")
    .ilike("ref_code", "IQC-SES-%")
    .order("ref_code", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNum = last?.ref_code ? parseInt(last.ref_code.replace(/\D/g, ""), 10) + 1 : 1;
  const sessionRef = `IQC-SES-${String(nextNum).padStart(4, "0")}`;

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .insert({
      ref_code:        sessionRef,
      module:          request.topic,
      practitioner_id: practitionerId,
      session_date:    sessionDate,
      start_time:      "",   // captured later in Session Consent (V4)
      end_time:        "",
      venue:           venue ?? request.venue ?? "To be confirmed with client",
      audience_type:   request.audience_type,
      participants:    request.min_commit ?? 1,
      payout_amount:   payoutAmount,
      request_id:      id,
      consent_status:  "Pending consent",
      status:          "Upcoming",
    })
    .select("id")
    .single();
  if (sErr || !session) {
    log.error("Assign: session create failed", { error: sErr?.message, requestId: id });
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  const { error: uErr } = await supabase
    .from("session_requests")
    .update({ status: "Confirmed", assigned_to: practitionerId })
    .eq("id", id);
  if (uErr) {
    log.error("Assign: request confirm failed", { error: uErr.message, requestId: id });
    return NextResponse.json({ error: "Session created but confirming the request failed" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "assign_practitioner", recordTable: "session_requests", recordId: id,
      snapshot: { assigned_to: practitionerId, practitioner_name: practitioner.name, session_ref: sessionRef, after: { status: "Confirmed" } },
    });
  }
  return NextResponse.json(
    { assignedTo: practitioner.name, sessionRef, sessionId: session.id },
    { status: 200 }
  );
}
