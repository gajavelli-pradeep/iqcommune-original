import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPaymentFields } from "@/lib/practitioner-payment";
import { log } from "@/lib/logger";
import { computeNet, generateConfirmationRef } from "@/lib/consent";
import { signConsentUrl } from "@/lib/hmac";
import { generateAndStoreConfirmationPdf } from "@/lib/pdf/generate-confirmation";
import { sendEmail } from "@/lib/email/brevo";
import { sessionConfirmationEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";
import { logActivity, type ActorRole } from "@/lib/admin-audit";
import type { DurationOption } from "@/lib/schemas/consent";

function displayDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// "14:30" → "2:30 PM"; add N hours for the end time. Kept local — this is the one
// place a session's display time is minted (from the admin-entered start + duration).
function fmt12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
// Add N hours to a 24h "HH:MM", returning 24h "HH:MM" (fmt12 handles display).
function addHours24(hhmm: string, hrs: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const total = (h * 60 + m + hrs * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export interface GenerateConfirmationInput {
  sessionId: string;
  gross: number;
  tdsRate: number;
  gstRate: number;
  startTime: string; // "HH:MM" 24h
  duration: DurationOption;
  baseUrl: string;
  actor: { email: string; role: ActorRole } | null;
}

export type GenerateConfirmationResult =
  | { ok: true; id: string; ref_code: string; consent_link: string; net: number }
  | { ok: false; status: number; error: string };

// The read-only fields the consent form auto-populates from the request + practitioner
// onboarding record. Shown for review before generating.
export interface ConsentAutofill {
  firstName: string;
  practitionerName: string;
  module: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  audience: string;
  participants: number;
  spoc: string;
  agreementRef: string;
  invoiceBy: string;
  paymentMethod: string; // actual UPI id / bank account on file, for the review screen
  payoutAmount: number;  // agreed payout — prefills the Gross field
  // V5: underlying source-record IDs so the Global-Admin per-field pencil knows
  // which record to PATCH (session / request / practitioner).
  sessionId: string;
  requestId: string | null;
  practitionerId: string;
  dateRaw: string | null; // raw session_date (YYYY-MM-DD) for the date-correction input
}

/**
 * Gather the auto-populated confirmation fields for a session, for the "Generate a
 * new confirmation" review screen. Read-only — no writes, no email, no PDF.
 *
 * The enrichment here (SPOC + city/state from the request, active agreement ref,
 * invoice-by, payment method) MIRRORS the snapshot logic in
 * generateConfirmationForSession below — keep the two in sync so the review screen
 * shows exactly what the generated document will carry.
 */
export async function getConsentAutofill(
  sessionId: string
): Promise<{ ok: true; data: ConsentAutofill } | { ok: false; status: number; error: string }> {
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("ref_code, module, practitioner_id, request_id, audience_type, session_date, venue, participants, payout_amount, consent_status, status, practitioner:practitioners(name, pay_to_family, family_name, upi_id, bank_account)")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .single();

  if (error || !session) return { ok: false, status: 404, error: "Session not found" };
  if (session.status !== "Upcoming" || session.consent_status !== "Pending consent") {
    return { ok: false, status: 409, error: "This session is not awaiting consent" };
  }

  const practitioner = Array.isArray(session.practitioner) ? session.practitioner[0] : session.practitioner;
  const practitionerName = practitioner?.name ?? "Practitioner";
  // upi_id / bank_account are encrypted at rest — decrypt for the review screen
  // (server-side, admin-only) so the admin sees the real payment detail, not ciphertext.
  const pay = practitioner ? decryptPaymentFields(practitioner as Record<string, unknown>) : null;
  const upiId = (typeof pay?.upi_id === "string" ? pay.upi_id : "") || "";
  const bankAccount = (typeof pay?.bank_account === "string" ? pay.bank_account : "") || "";

  let reqRow: { name: string | null; city: string | null; state: string | null } | null = null;
  if (session.request_id) {
    const { data } = await supabase
      .from("session_requests")
      .select("name, city, state")
      .eq("id", session.request_id)
      .maybeSingle();
    reqRow = data;
  }
  const { data: agr } = await supabase
    .from("agreements")
    .select("ref_code")
    .eq("practitioner_id", session.practitioner_id)
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ok: true,
    data: {
      firstName: practitionerName.split(" ")[0] || practitionerName,
      practitionerName,
      module: session.module,
      date: displayDate(session.session_date),
      venue: session.venue,
      city: reqRow?.city ?? "",
      state: reqRow?.state ?? "",
      audience: session.audience_type,
      participants: session.participants,
      spoc: reqRow?.name ?? "—",
      agreementRef: agr?.ref_code ?? "—",
      invoiceBy: practitioner?.pay_to_family && practitioner?.family_name ? practitioner.family_name : practitionerName,
      paymentMethod: upiId || bankAccount || "—",
      payoutAmount: session.payout_amount,
      sessionId,
      requestId: session.request_id ?? null,
      practitionerId: session.practitioner_id,
      dateRaw: session.session_date ?? null,
    },
  };
}

/**
 * Create a per-session revenue confirmation for whoever the session is currently
 * assigned to: computes net, mints the display time, enriches the snapshot, inserts
 * the row, signs the consent link, generates the PDF, and emails the practitioner.
 *
 * Shared by the admin "Generate consent" route and the Global-Admin reassignment
 * route (which supersedes the prior confirmation, moves the session to the new
 * practitioner, then calls this to re-drive consent). The session must already be
 * Upcoming + Pending consent with no active confirmation — the same guards the
 * generate flow has always enforced.
 */
export async function generateConfirmationForSession(
  input: GenerateConfirmationInput
): Promise<GenerateConfirmationResult> {
  const { sessionId, gross, tdsRate, gstRate, startTime, duration, baseUrl, actor } = input;
  const supabase = createAdminClient();

  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, ref_code, module, practitioner_id, request_id, audience_type, session_date, venue, participants, consent_status, status, practitioner:practitioners(name, email, pay_to_family, family_name, upi_id, bank_account)")
    .eq("id", sessionId)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !session) {
    return { ok: false, status: 404, error: "Session not found" };
  }
  if (session.status !== "Upcoming" || session.consent_status !== "Pending consent") {
    return { ok: false, status: 409, error: "Consent can only be generated for Upcoming sessions still pending consent" };
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
    return { ok: false, status: 409, error: "An active confirmation already exists for this session" };
  }

  const practitioner = Array.isArray(session.practitioner) ? session.practitioner[0] : session.practitioner;
  const practitionerName = practitioner?.name ?? "Practitioner";
  const practitionerEmail = practitioner?.email ?? "";

  const { net, tdsAmount, gstAmount } = computeNet({ gross, tdsRate, gstRate });
  const refCode = generateConfirmationRef();
  const dateDisplay = displayDate(session.session_date);

  // Mint the display time from the admin-entered start + duration, and persist it
  // onto the session (Assign left start/end blank — this is where they're captured).
  const endTime24 = addHours24(startTime, duration === "6 hours" ? 6 : 3);
  const startDisplay = fmt12(startTime);
  const endDisplay = endTime24 ? fmt12(endTime24) : "";
  const time = `${startDisplay} – ${endDisplay}`;
  // Persist raw 24h HH:MM onto the session; the display strings feed the snapshot/PDF/email.
  await supabase.from("sessions").update({ start_time: startTime, end_time: endTime24 }).eq("id", sessionId);

  // Enrich the snapshot with V4 fields: SPOC + city/state from the originating
  // request, the active empanelment agreement ref, and invoice/payment details.
  let reqRow: { name: string | null; city: string | null; state: string | null } | null = null;
  if (session.request_id) {
    const { data } = await supabase
      .from("session_requests")
      .select("name, city, state")
      .eq("id", session.request_id)
      .maybeSingle();
    reqRow = data;
  }
  const { data: agr } = await supabase
    .from("agreements")
    .select("ref_code")
    .eq("practitioner_id", session.practitioner_id)
    .eq("status", "Active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const firstName = practitionerName.split(" ")[0] || practitionerName;
  const agreementRef = agr?.ref_code ?? "—";
  const issuedOn = displayDate(new Date().toISOString());
  const city = reqRow?.city ?? "";
  const state = reqRow?.state ?? "";
  const audience = session.audience_type;
  const spoc = reqRow?.name ?? "—";
  const invoiceBy = practitioner?.pay_to_family && practitioner?.family_name ? practitioner.family_name : practitionerName;
  const paymentMethod = practitioner?.upi_id ? "UPI" : practitioner?.bank_account ? "Bank transfer" : "—";

  const snapshot = {
    practitionerName,
    firstName,
    agreementRef,
    issuedOn,
    sessionRef: session.ref_code,
    module: session.module,
    date: dateDisplay,
    time,
    startTime: startDisplay,
    duration,
    venue: session.venue,
    city,
    state,
    audience,
    participants: session.participants,
    spoc,
    gross, tdsRate, tdsAmount, gstRate, gstAmount, net,
    invoiceBy,
    paymentMethod,
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
    return { ok: false, status: 500, error: "Failed to generate confirmation" };
  }

  const consentLink = signConsentUrl(refCode, baseUrl);
  await supabase.from("confirmations").update({ consent_link: consentLink }).eq("id", created.id);

  // PDF (non-fatal — the confirmation exists regardless).
  try {
    const storagePath = await generateAndStoreConfirmationPdf({
      refCode, practitionerName, sessionRef: session.ref_code,
      module: session.module, date: dateDisplay, time, venue: session.venue,
      participants: session.participants, gross, tdsRate, tdsAmount, gstRate, gstAmount, net,
      agreementRef, issuedOn, startTime: startDisplay, duration,
      city, state, audience, spoc, invoiceBy, paymentMethod,
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
          startTime: startDisplay, endTime: endDisplay, venue: session.venue,
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

  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "generate_consent", recordTable: "confirmations", recordId: created.id,
      snapshot: { ref_code: refCode, session_ref: session.ref_code, after: { status: "Awaiting consent", gross, net } },
    });
  }

  return { ok: true, id: created.id, ref_code: refCode, consent_link: consentLink, net };
}
