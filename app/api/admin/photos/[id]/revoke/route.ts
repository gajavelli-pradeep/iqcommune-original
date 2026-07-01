import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { requireSuperAdmin } from "@/lib/supabase/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Return a submission to Pending for re-review (distinct from Reject → Rejected):
//   • Approved → Pending — any admin ("Revoke approval").
//   • Rejected → Pending — Super Admin only ("Reopen").
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

  if (submission.status === "Rejected") {
    // Reopening a rejected set is a Super-Admin-only recovery action.
    const denySA = await requireSuperAdmin();
    if (denySA) return denySA;
  } else if (submission.status !== "Approved") {
    return NextResponse.json(
      { error: `Cannot revoke a submission with status "${submission.status}"` },
      { status: 409 }
    );
  }

  // Atomic — WHERE status IN (...) guards against a concurrent change.
  const { error: updateErr } = await supabase
    .from("photo_submissions")
    .update({ status: "Pending" })
    .eq("id", id)
    .in("status", ["Approved", "Rejected"]);

  if (updateErr) {
    log.error("Photo revoke update failed", { error: updateErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to revoke approval" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
