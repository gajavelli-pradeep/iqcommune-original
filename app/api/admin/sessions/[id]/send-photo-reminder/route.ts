import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signPhotoUrl } from "@/lib/hmac";
import { getBaseUrl } from "@/lib/base-url";
import { sendEmail } from "@/lib/email/brevo";
import { photoLinkReminderEmail } from "@/lib/email/templates";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

/**
 * Email the practitioner their photo-upload link.
 *
 * The "Generate photo link" / "Send reminder" actions produce the same signed
 * URL as GET /photo-link; this POST sends it via Brevo instead of leaving the
 * admin to copy-paste. A reminder is intentionally re-sendable, so there is no
 * send-once idempotency guard — double-clicks are prevented by the client's
 * in-flight disable, and every attempt is audited.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const baseUrl = getBaseUrl(req);
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("ref_code, module, session_date, status, practitioner_id")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "Completed") {
    return NextResponse.json({ error: "Photo links can only be sent for Completed sessions." }, { status: 422 });
  }

  const { data: practitioner, error: pErr } = await supabase
    .from("practitioners")
    .select("ref_code, name, email, role, city, state")
    .eq("id", session.practitioner_id)
    .single();

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }
  if (!practitioner.email) {
    return NextResponse.json({ error: "No email address on file for this practitioner." }, { status: 409 });
  }

  const url = signPhotoUrl(
    {
      ref: practitioner.ref_code ?? "",
      session: session.ref_code ?? "",
      module: session.module ?? "",
      date: session.session_date ?? "",
      city: (practitioner as unknown as Record<string, string>).city ?? "",
      state: (practitioner as unknown as Record<string, string>).state ?? "",
      name: practitioner.name ?? "",
      role: practitioner.role ?? "",
    },
    "/submit-photos",
    baseUrl,
  );

  const { subject, htmlContent } = photoLinkReminderEmail(practitioner.name ?? "", url, session.ref_code ?? "");

  try {
    const { messageId } = await sendEmail({ to: practitioner.email, name: practitioner.name ?? undefined, subject, htmlContent });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: "admin",
      action: "send_photo_reminder",
      recordTable: "sessions",
      recordId: id,
      snapshot: { to: practitioner.email, messageId },
    });
    return NextResponse.json({ ok: true, sentTo: practitioner.email });
  } catch (err) {
    log.error("Photo reminder send failed", { error: (err as Error).message, sessionId: id });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: "admin",
      action: "send_photo_reminder_failed",
      recordTable: "sessions",
      recordId: id,
      snapshot: { to: practitioner.email, error: (err as Error).message },
    });
    return NextResponse.json(
      { error: "Couldn't send the email automatically. Copy the link and send it manually instead." },
      { status: 502 },
    );
  }
}
