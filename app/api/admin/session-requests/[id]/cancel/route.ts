import { NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email/brevo";
import { sessionCancelledEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";

export const dynamic = "force-dynamic";

// V5 P1-2: cancel a Confirmed request. Cascades the request AND its linked session
// to Cancelled (a single operator action), then notifies the client. Cancelled
// sessions drop out of the consent/photos/payouts pipeline (read-side filters).
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: request, error: rErr } = await supabase
    .from("session_requests")
    .select("id, name, email, topic, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (rErr || !request) {
    return NextResponse.json({ error: "Session request not found" }, { status: 404 });
  }
  if (request.status !== "Confirmed") {
    return NextResponse.json(
      { error: "Only a confirmed request can be cancelled" },
      { status: 409 },
    );
  }

  // Cascade to the linked session first, so a failure here leaves the request
  // Confirmed (recoverable) rather than orphaning a live session under a
  // cancelled request.
  const { data: session } = await supabase
    .from("sessions")
    .select("id, ref_code, status")
    .eq("request_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (session && session.status !== "Cancelled") {
    const { error: sErr } = await supabase
      .from("sessions")
      .update({ status: "Cancelled" })
      .eq("id", session.id)
      .is("deleted_at", null);
    if (sErr) {
      log.error("Cancel: session cascade failed", { error: sErr.message, requestId: id });
      return NextResponse.json({ error: "Failed to cancel the linked session" }, { status: 500 });
    }
  }

  const { error: uErr } = await supabase
    .from("session_requests")
    .update({ status: "Cancelled" })
    .eq("id", id)
    .eq("status", "Confirmed");
  if (uErr) {
    log.error("Cancel: request update failed", { error: uErr.message, requestId: id });
    return NextResponse.json({ error: "Failed to cancel the request" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "cancel_session_request",
      recordTable: "session_requests",
      recordId: id,
      snapshot: {
        session_ref: session?.ref_code ?? null,
        before: { status: "Confirmed" },
        after: { status: "Cancelled" },
      },
    });
  }

  // Notify the client (idempotent, non-fatal).
  if (request.email) {
    const alreadySent = await guardEmailSend("session_cancelled", id, request.email as string);
    if (!alreadySent) {
      try {
        const { subject, htmlContent } = sessionCancelledEmail(request.name as string, {
          topic: request.topic as string,
          sessionRef: session?.ref_code as string | undefined,
        });
        await sendEmail({ to: request.email as string, name: request.name as string, subject, htmlContent });
      } catch (emailErr) {
        log.error("Session cancelled email failed — revoking sentinel so it can retry", { error: String(emailErr), requestId: id });
        await revokeEmailSend("session_cancelled", id);
      }
    }
  }

  return NextResponse.json({ ok: true, sessionRef: session?.ref_code ?? null }, { status: 200 });
}
