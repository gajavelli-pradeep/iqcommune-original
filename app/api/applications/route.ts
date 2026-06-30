import { NextRequest, NextResponse } from "next/server";
import { ApplicationSchema } from "@/lib/schemas/application";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { encryptOptional } from "@/lib/encrypt";
import { sendEmail } from "@/lib/email/brevo";
import { applicationConfirmation } from "@/lib/email/templates";
import { guardEmailSend } from "@/lib/email/idempotency";
import { signStatusUrl } from "@/lib/hmac";

export async function POST(req: NextRequest) {
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

  const parsed = ApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createAdminClient();

  const { data: refCode, error: refErr } = await supabase.rpc("next_practitioner_ref");
  if (refErr || !refCode) {
    log.error("Failed to generate practitioner ref code", { error: refErr?.message, ip });
    return NextResponse.json({ error: "Failed to generate reference code" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("practitioners")
    .insert({
      name:             `${d.firstName} ${d.lastName}`,
      email:            d.email,
      phone:            d.phone,
      role:             d.role,
      experience:       d.experience,
      city:             d.city,
      state:            d.state,
      modules:          d.modules,
      teach_freq:       d.teachFreq,
      why:              d.why,
      // payment fields encrypted at rest
      upi_id:           encryptOptional(d.upiId),
      bank_name:        encryptOptional(d.bankAccountName),
      bank_account:     encryptOptional(d.bankAccount),
      ifsc:             encryptOptional(d.ifsc),
      pay_to_family:    d.payToFamily,
      family_name:      d.familyName ?? null,
      family_relation:  d.familyRelation ?? null,
      family_upi:       encryptOptional(d.familyUpi),
      family_bank:      encryptOptional(d.familyBankAccount),
      family_ifsc:      encryptOptional(d.familyIfsc),
      ref_code:         refCode as string,
      status:           "Applied",
    })
    .select("id, ref_code")
    .single();

  if (error) {
    log.error("Failed to insert practitioner application", {
      error: error.message,
      code: error.code,
      ip,
    });
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An application with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const { id, ref_code } = data as { id: string; ref_code: string };

  // Send applicant confirmation (idempotent — safe on retry)
  const alreadySent = await guardEmailSend("application_received", id, d.email);
  if (!alreadySent) {
    try {
      const { subject, htmlContent } = applicationConfirmation({
        name:      `${d.firstName} ${d.lastName}`,
        ref:       ref_code,
        modules:   [...d.modules],
        statusUrl: signStatusUrl(ref_code),
      });
      await sendEmail({
        to:          d.email,
        name:        `${d.firstName} ${d.lastName}`,
        subject,
        htmlContent,
      });
    } catch (emailErr) {
      log.error("Application confirmation email failed", { error: String(emailErr), id });
    }
  }

  return NextResponse.json({ id, refCode: ref_code }, { status: 201 });
}
