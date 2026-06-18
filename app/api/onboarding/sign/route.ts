import { NextRequest, NextResponse } from "next/server";
import { AgreementSignSchema } from "@/lib/schemas/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOnboardingParams } from "@/lib/hmac";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";

type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

  // Verify the HMAC signature from the original onboarding URL.
  // This prevents anyone who guesses a ref_code from signing without the link.
  const sp = new URLSearchParams({ ...linkParams, sig: linkSig });
  if (!verifyOnboardingParams(sp)) {
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

  const agreement = data as AgreementRow;

  if (agreement.status === "Active") {
    return NextResponse.json({ error: "Agreement already signed" }, { status: 409 });
  }

  // ip already resolved at top of handler
  const signedAt = new Date().toISOString(); // server-side — never trust client

  // Atomic guard: the WHERE status = 'Pending signature' ensures only one
  // concurrent request wins the race. If another request signed first,
  // updatedAgreement will be null and we return 409.
  const { data: updatedAgreement, error: updateErr } = await supabase
    .from("agreements")
    .update({
      signed_at: signedAt,
      signature_method: sigMode,
      signature_data: sigData,
      signer_ip: ip,
      status: "Active",
    })
    .eq("id", agreement.id)
    .eq("status", "Pending signature")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    log.error("Failed to record agreement signature", {
      error: updateErr.message,
      agreementId: agreement.id,
    });
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }

  if (!updatedAgreement) {
    // Another concurrent request already activated this agreement.
    return NextResponse.json({ error: "Agreement already signed" }, { status: 409 });
  }

  // Promote practitioner to Empanelled — check the error so partial failure is visible.
  const { error: promoteErr } = await supabase
    .from("practitioners")
    .update({ status: "Empanelled" })
    .eq("id", agreement.practitioner_id);

  if (promoteErr) {
    // Agreement is already Active — log but don't fail the response.
    // Admin can manually correct the practitioner status.
    log.error("Agreement signed but practitioner status promotion failed", {
      error: promoteErr.message,
      practitionerId: agreement.practitioner_id,
      agreementId: agreement.id,
    });
  }

  return NextResponse.json({
    timestamp: signedAt,
    refCode: ref,
    signedBy: fullName,
    designation,
  });
}
