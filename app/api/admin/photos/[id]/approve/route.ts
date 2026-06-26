import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email/brevo";
import { photoApproved } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend } from "@/lib/email/idempotency";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: submission, error: fetchErr } = await supabase
    .from("photo_submissions")
    .select("id, status, practitioner_ref, session_ref")
    .eq("id", id)
    .single();

  if (fetchErr || !submission) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  // Atomic UPDATE: WHERE status = 'Pending' prevents concurrent double-approve.
  // If 0 rows are affected the submission was already approved/rejected/expired.
  const { data: approved, error: updateErr } = await supabase
    .from("photo_submissions")
    .update({ status: "Approved" })
    .eq("id", id)
    .eq("status", "Pending")
    .select("id")
    .maybeSingle();

  if (updateErr) {
    log.error("Photo approve update failed", { error: updateErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to approve submission" }, { status: 500 });
  }

  if (!approved) {
    return NextResponse.json(
      { error: `Submission is not in Pending status (current: ${submission.status})` },
      { status: 409 }
    );
  }

  // Notify practitioner (idempotent, best-effort)
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("name, email")
    .eq("ref_code", submission.practitioner_ref)
    .single();

  if (!practitioner?.email) {
    log.error("Photo approve: practitioner not found for notification", {
      practitionerRef: submission.practitioner_ref,
      submissionId: id,
    });
  } else {
    const alreadySent = await guardEmailSend("photo_approved", id, practitioner.email as string);
    if (!alreadySent) {
      try {
        const { subject, htmlContent } = photoApproved({
          practitionerName: practitioner.name as string,
          sessionRef:       submission.session_ref ?? "",
        });
        await sendEmail({ to: practitioner.email as string, name: practitioner.name as string, subject, htmlContent });
      } catch (emailErr) {
        log.error("Photo approved email failed — revoking sentinel for retry", {
          error: String(emailErr),
          submissionId: id,
        });
        await revokeEmailSend("photo_approved", id);
      }
    }
  }

  return new NextResponse(null, { status: 204 });
}
