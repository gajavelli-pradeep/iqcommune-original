import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { GenerateConsentSchema } from "@/lib/schemas/consent";
import { computeNet, generateConfirmationRef } from "@/lib/consent";
import { signConsentUrl } from "@/lib/hmac";
import { generateAndStoreConfirmationPdf } from "@/lib/pdf/generate-confirmation";
import { sendEmail } from "@/lib/email/brevo";
import { sessionConfirmationEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";

function displayDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("confirmations")
    .select("*, practitioner:practitioners(name, email)")
    .is("deleted_at", null)
    .order("issued_on", { ascending: false });

  if (error) {
    log.error("Confirmations GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load confirmations" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GenerateConsentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { sessionId, gross, tdsRate, gstRate } = parsed.data;
  const supabase = createAdminClient();

  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, ref_code, module, practitioner_id, session_date, start_time, end_time, venue, participants, consent_status, status, practitioner:practitioners(name, email)")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "Upcoming" || session.consent_status !== "Pending consent") {
    return NextResponse.json(
      { error: "Consent can only be generated for Upcoming sessions still pending consent" },
      { status: 409 }
    );
  }

  // One live confirmation per session (the DB unique index is the hard guard).
  const { data: existing } = await supabase
    .from("confirmations")
    .select("id")
    .eq("session_id", sessionId)
    .neq("status", "Superseded")
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "An active confirmation already exists for this session" }, { status: 409 });
  }

  const practitioner = Array.isArray(session.practitioner) ? session.practitioner[0] : session.practitioner;
  const practitionerName = practitioner?.name ?? "Practitioner";
  const practitionerEmail = practitioner?.email ?? "";

  const { net, tdsAmount, gstAmount } = computeNet({ gross, tdsRate, gstRate });
  const refCode = generateConfirmationRef();
  const time = `${session.start_time} – ${session.end_time}`;
  const dateDisplay = displayDate(session.session_date);

  const snapshot = {
    practitionerName,
    sessionRef: session.ref_code,
    module: session.module,
    date: dateDisplay,
    time,
    venue: session.venue,
    participants: session.participants,
    gross, tdsRate, tdsAmount, gstRate, gstAmount, net,
  };

  const { data: created, error: insertErr } = await supabase
    .from("confirmations")
    .insert({
      ref_code: refCode,
      session_id: sessionId,
      practitioner_id: session.practitioner_id,
      session_ref: session.ref_code,
      gross_amount: gross,
      tds_rate: tdsRate,
      gst_rate: gstRate,
      net_amount: net,
      snapshot,
      status: "Awaiting consent",
    })
    .select("id, ref_code")
    .single();

  if (insertErr || !created) {
    log.error("Confirmation insert failed", { error: insertErr?.message, sessionId });
    return NextResponse.json({ error: "Failed to generate confirmation" }, { status: 500 });
  }

  const consentLink = signConsentUrl(refCode);
  await supabase.from("confirmations").update({ consent_link: consentLink }).eq("id", created.id);

  // PDF (non-fatal — the confirmation exists regardless).
  try {
    const storagePath = await generateAndStoreConfirmationPdf({
      refCode, practitionerName, sessionRef: session.ref_code,
      module: session.module, date: dateDisplay, time, venue: session.venue,
      participants: session.participants, gross, tdsRate, tdsAmount, gstRate, gstAmount, net,
    });
    await supabase.from("confirmations").update({ storage_path: storagePath }).eq("id", created.id);
  } catch (pdfErr) {
    log.error("Confirmation PDF generation failed — record exists, storage_path NULL", { error: String(pdfErr), refCode });
  }

  // Email the signed consent link (best-effort, idempotent). Admin can also copy the link.
  if (practitionerEmail) {
    const alreadySent = await guardEmailSend("session_confirmation", created.id, practitionerEmail);
    if (!alreadySent) {
      try {
        const { subject, htmlContent } = sessionConfirmationEmail(practitionerName, {
          refCode: session.ref_code, module: session.module, date: dateDisplay,
          startTime: session.start_time, endTime: session.end_time, venue: session.venue,
          participants: session.participants,
          grossAmount: gross, tdsAmount, netAmount: net, tdsRate,
          consentUrl: consentLink,
        });
        await sendEmail({ to: practitionerEmail, name: practitionerName, subject, htmlContent });
      } catch (emailErr) {
        log.error("Session confirmation email failed — revoking sentinel", { error: String(emailErr), refCode });
        await revokeEmailSend("session_confirmation", created.id);
      }
    }
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "generate_consent", recordTable: "confirmations", recordId: created.id,
      snapshot: { ref_code: refCode, session_ref: session.ref_code, after: { status: "Awaiting consent", gross, net } },
    });
  }

  return NextResponse.json(
    { data: { id: created.id, ref_code: refCode, consent_link: consentLink, net } },
    { status: 201 }
  );
}
