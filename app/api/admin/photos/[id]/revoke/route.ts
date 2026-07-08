import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

// Return a submission to Pending for re-review (distinct from Reject → Rejected):
//   • Approved → Pending — any admin ("Revoke approval").
//   • Rejected → Pending — Global Admin only ("Reopen").
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
    const denySA = await requireGlobalAdmin();
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

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: submission.status === "Rejected" ? "reopen_photos" : "revoke_photo_approval",
      recordTable: "photo_submissions", recordId: id,
      snapshot: { before: { status: submission.status }, after: { status: "Pending" } },
    });
  }

  return new NextResponse(null, { status: 204 });
}
