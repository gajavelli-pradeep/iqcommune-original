import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

const REJECTABLE = ["Pending", "Approved"] as const;

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

  if (!(REJECTABLE as readonly string[]).includes(submission.status)) {
    return NextResponse.json(
      { error: `Cannot reject a submission with status "${submission.status}"` },
      { status: 409 }
    );
  }

  const { error: updateErr } = await supabase
    .from("photo_submissions")
    .update({ status: "Rejected" })
    .eq("id", id)
    .in("status", [...REJECTABLE]);

  if (updateErr) {
    log.error("Photo reject update failed", { error: updateErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to reject submission" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "reject_photos", recordTable: "photo_submissions", recordId: id,
      snapshot: { before: { status: submission.status }, after: { status: "Rejected" } },
    });
  }

  return new NextResponse(null, { status: 204 });
}
