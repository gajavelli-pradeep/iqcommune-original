import { NextRequest, NextResponse } from "next/server";
import { ConsentSubmitSchema } from "@/lib/schemas/consent";
import { verifyConsentToken } from "@/lib/hmac";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { generateAndStoreConfirmationPdf } from "@/lib/pdf/generate-confirmation";

// Drawn signatures are base64 PNG — cap before validation/DB storage.
const MAX_BODY_BYTES = 600_000;

interface ConfSnapshot {
  practitionerName: string; sessionRef: string; module: string; date: string;
  time: string; venue: string; participants: number;
  gross: number; tdsRate: number; tdsAmount: number; gstRate: number; gstAmount: number; net: number;
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(reset) } });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConsentSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { ref, token, signatureMethod, signatureData } = parsed.data;

  if (!verifyConsentToken(ref, token)) {
    return NextResponse.json({ error: "Invalid or tampered link" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: conf, error: fetchErr } = await supabase
    .from("confirmations")
    .select("id, status, session_id, ref_code, snapshot")
    .eq("ref_code", ref)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !conf) {
    return NextResponse.json({ error: "Invalid confirmation reference" }, { status: 403 });
  }
  if (conf.status !== "Awaiting consent") {
    return NextResponse.json({ error: "This confirmation has already been consented to." }, { status: 409 });
  }

  const signedAt = new Date().toISOString();

  const { data: updated, error: updErr } = await supabase
    .from("confirmations")
    .update({
      signed_at: signedAt,
      signature_method: signatureMethod,
      signature_data: signatureData,
      signer_ip: ip,
      status: "Consent received",
    })
    .eq("id", conf.id)
    .eq("status", "Awaiting consent")
    .select("id")
    .maybeSingle();

  if (updErr) {
    log.error("Consent submit update failed", { error: updErr.message, ref });
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "This confirmation has already been consented to." }, { status: 409 });
  }

  // Flip the linked session (best-effort).
  const { error: sessErr } = await supabase
    .from("sessions")
    .update({ consent_status: "Consent given" })
    .eq("id", conf.session_id);
  if (sessErr) log.error("Failed to flip session consent_status after consent", { error: sessErr.message, sessionId: conf.session_id });

  // Regenerate the PDF with the signature block (non-fatal).
  const s = conf.snapshot as unknown as ConfSnapshot;
  try {
    const storagePath = await generateAndStoreConfirmationPdf({
      refCode: conf.ref_code, practitionerName: s.practitionerName, sessionRef: s.sessionRef,
      module: s.module, date: s.date, time: s.time, venue: s.venue, participants: s.participants,
      gross: s.gross, tdsRate: s.tdsRate, tdsAmount: s.tdsAmount, gstRate: s.gstRate, gstAmount: s.gstAmount, net: s.net,
      signedAt, sigMode: signatureMethod, sigTypedName: s.practitionerName,
    });
    await supabase.from("confirmations").update({ storage_path: storagePath }).eq("id", conf.id);
  } catch (pdfErr) {
    log.error("Signed confirmation PDF regeneration failed", { error: String(pdfErr), ref });
  }

  return NextResponse.json({ timestamp: signedAt, refCode: conf.ref_code, net: s.net });
}
