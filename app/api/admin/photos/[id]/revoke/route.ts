import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Revoke an approval — returns an Approved submission to Pending for re-review
// (distinct from Reject, which sets Rejected).
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
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !submission) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  if (submission.status !== "Approved") {
    return NextResponse.json(
      { error: `Cannot revoke a submission with status "${submission.status}"` },
      { status: 409 }
    );
  }

  // Atomic — WHERE status = 'Approved' guards against a concurrent change.
  const { error: updateErr } = await supabase
    .from("photo_submissions")
    .update({ status: "Pending" })
    .eq("id", id)
    .eq("status", "Approved");

  if (updateErr) {
    log.error("Photo revoke update failed", { error: updateErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to revoke approval" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
