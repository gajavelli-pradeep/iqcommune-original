import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { signOnboardingUrl } from "@/lib/hmac";
import { getBaseUrl } from "@/lib/base-url";
import { sendEmail } from "@/lib/email/brevo";
import { agreementLinkEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { practitionerId } =
    (body as { practitionerId?: string }) ?? {};

  if (!practitionerId) {
    return NextResponse.json({ error: "practitionerId required" }, { status: 400 });
  }
  if (!UUID_RE.test(practitionerId)) {
    return NextResponse.json({ error: "practitionerId must be a valid UUID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioners")
    .select("*")
    .eq("id", practitionerId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const p = data as PractitionerRow;

  if (p.status === "Empanelled") {
    return NextResponse.json(
      { error: "Practitioner is already empanelled" },
      { status: 409 }
    );
  }

  // Status allowlist — the UI hides the button for other stages, but the API
  // must independently reject Applied / Under Review / Rejected practitioners.
  // Without this, a direct call could mint a valid signed link for a Rejected
  // applicant. "Agreement Sent" is allowed so the link can be re-issued.
  if (!["Screening Done", "Agreement Sent"].includes(p.status ?? "")) {
    return NextResponse.json(
      { error: "Can only send agreement at Screening Done stage" },
      { status: 422 }
    );
  }

  if (!p.modules || p.modules.length === 0) {
    return NextResponse.json(
      { error: "Practitioner has no modules assigned — add at least one before sending the empanelment link" },
      { status: 422 }
    );
  }

  const url = signOnboardingUrl({
    name:   p.name,
    role:   p.role,
    org:    p.org ?? "Independent",
    module: p.modules[0],
    city:   p.city,
    state:  p.state ?? "",
    ref:    p.ref_code ?? "",
    email:  p.email,
  }, getBaseUrl(req));

  const refCode = `IQC-EMP-${p.ref_code}`;

  // Guard against downgrading an already-active (signed) agreement.
  // Insert only if no row exists yet; ignore the duplicate if one already exists.
  const { error: upsertErr } = await supabase.from("agreements").upsert(
    {
      practitioner_id: practitionerId,
      ref_code:        refCode,
      module:          p.modules[0],
      status:          "Pending signature",
    },
    { onConflict: "ref_code", ignoreDuplicates: true }
  );

  if (upsertErr) {
    log.error("Onboarding link: agreement upsert failed", {
      error: upsertErr.message,
      practitionerId,
    });
    return NextResponse.json({ error: "Failed to create agreement record" }, { status: 500 });
  }

  // Advance practitioner status to "Agreement Sent" server-side.
  // The email is auto-sent below; status must not depend on the admin clicking a modal button.
  const { error: statusErr } = await supabase
    .from("practitioners")
    .update({ status: "Agreement Sent" })
    .eq("id", practitionerId)
    .eq("status", "Screening Done");
  if (statusErr) {
    log.error("Onboarding link: status update failed", { error: statusErr.message, practitionerId });
    // Non-fatal — link was generated; admin can correct status manually.
  }

  // Auto-send agreement link email (idempotent).
  // revokeEmailSend on failure allows the next call to retry.
  const alreadySent = await guardEmailSend("agreement_link", refCode, p.email);
  if (!alreadySent) {
    try {
      const { subject, htmlContent } = agreementLinkEmail(p.name, url);
      await sendEmail({ to: p.email, name: p.name, subject, htmlContent });
      log.info("Agreement link emailed", { practitionerId, refCode });
    } catch (emailErr) {
      log.error("Agreement link email failed — revoking sentinel for retry", {
        error: String(emailErr),
        practitionerId,
      });
      await revokeEmailSend("agreement_link", refCode);
    }
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "generate_agreement_link", recordTable: "practitioners", recordId: practitionerId,
      snapshot: { name: p.name, ref_code: p.ref_code, before: { status: p.status }, after: { status: "Agreement Sent" } },
    });
  }

  return NextResponse.json({ url, refCode });
}
