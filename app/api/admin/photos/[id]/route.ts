import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: submission, error: fetchErr } = await supabase
    .from("photo_submissions")
    .select("id, storage_keys")
    .eq("id", id)
    .single();

  if (fetchErr || !submission) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  // Delete files from Storage (best-effort — log errors but don't block record deletion)
  const keys = (submission.storage_keys ?? []) as string[];
  if (keys.length > 0) {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove(keys);
    if (storageErr) {
      log.error("Storage delete partial failure", { error: storageErr.message, submissionId: id });
    }
  }

  const { error: deleteErr } = await supabase
    .from("photo_submissions")
    .delete()
    .eq("id", id);

  if (deleteErr) {
    log.error("Photo submission DELETE db failed", { error: deleteErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
