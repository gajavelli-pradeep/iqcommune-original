import { NextRequest, NextResponse } from "next/server";
import { AgreementSignSchema } from "@/lib/schemas/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOnboardingParams } from "@/lib/hmac";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { generateAndStoreAgreementPdf } from "@/lib/pdf/generate-agreement";
import { sendEmail } from "@/lib/email/brevo";
import { agreementConfirmed } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend, recordEmailMessageId } from "@/lib/email/idempotency";

// Drawn signatures are base64-encoded PNG — cap at ~600 KB to block
// oversized uploads before they hit validation or DB storage.
const MAX_BODY_BYTES = 600_000;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(reset) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AgreementSignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ref, fullName, designation, sigMode, sigData, linkSig, linkParams } = parsed.data;

  // Verify HMAC signature from the original onboarding URL
  const sp = new URLSearchParams({ ...linkParams, sig: linkSig });
  if (!verifyOnboardingParams(sp)) {
    return NextResponse.json({ error: "Invalid or tampered link" }, { status: 403 });
  }

  // Bind the agreement lookup to the HMAC-verified ref. The top-level `ref` is
  // NOT covered by the signature, so without this check a holder of any one
  // valid link could sign a different practitioner's agreement by swapping it.
  if (ref !== `IQC-EMP-${linkParams.ref}`) {
    return NextResponse.json({ error: "Invalid or tampered link" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data, error: fetchErr } = await supabase
    .from("agreements")
    .select("id, status, practitioner_id")
    .eq("ref_code", ref)
    .single();

  if (fetchErr || !data) {
    return NextResponse.json({ error: "Invalid agreement reference" }, { status: 403 });
  }

  if (data.status === "Active") {
    return NextResponse.json({ error: "Agreement already signed" }, { status: 409 });
  }

  const signedAt = new Date().toISOString();

  // Atomic: WHERE status = 'Pending signature' ensures only one concurrent request wins.
  const { data: updatedAgreement, error: updateErr } = await supabase
    .from("agreements")
    .update({
      signed_at:        signedAt,
      signature_method: sigMode,
      signature_data:   sigData,
      signer_ip:        ip,
      status:           "Active",
    })
    .eq("id", data.id)
    .eq("status", "Pending signature")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    log.error("Failed to record agreement signature", {
      error: updateErr.message,
      agreementId: data.id,
    });
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }

  if (!updatedAgreement) {
    return NextResponse.json({ error: "Agreement already signed" }, { status: 409 });
  }

  // Practitioner promotion is handled atomically by DB trigger (0006_sign_agreement_atomic.sql)

  const agreementId = updatedAgreement.id as string;

  // Generate and store PDF (non-fatal — agreement is signed regardless of PDF success)
  try {
    const storagePath = await generateAndStoreAgreementPdf({
      practitionerName: fullName,
      designation,
      org:          linkParams.org,
      module:       linkParams.module,
      city:         linkParams.city,
      state:        linkParams.state,
      ref:          linkParams.ref,
      signedAt,
      sigMode,
      sigTypedName: fullName,
    });

    const { error: pathErr } = await supabase
      .from("agreements")
      .update({ storage_path: storagePath })
      .eq("id", agreementId);

    if (pathErr) {
      // Agreement is signed; missing storage_path means PDF is available in storage
      // but the link wasn't saved. Query storage_path IS NULL to find these.
      log.error("Failed to store PDF path on agreement row", {
        error: pathErr.message,
        agreementId,
        storagePath,
      });
    }
  } catch (pdfErr) {
    log.error("PDF generation failed — agreement is signed, PDF path is NULL", {
      error: String(pdfErr),
      ref,
    });
  }

  // Send agreement confirmation email (idempotent)
  const alreadySent = await guardEmailSend("agreement_signed", agreementId, linkParams.email);
  if (!alreadySent) {
    try {
      const { subject, htmlContent } = agreementConfirmed({ name: fullName, ref: linkParams.ref });
      const { messageId } = await sendEmail({ to: linkParams.email, name: fullName, subject, htmlContent });
      await recordEmailMessageId("agreement_signed", agreementId, messageId);
    } catch (emailErr) {
      log.error("Agreement confirmation email failed — revoking sentinel for retry", {
        error: String(emailErr),
        ref,
      });
      await revokeEmailSend("agreement_signed", agreementId);
    }
  }

  return NextResponse.json({ timestamp: signedAt, refCode: ref, signedBy: fullName, designation });
}
