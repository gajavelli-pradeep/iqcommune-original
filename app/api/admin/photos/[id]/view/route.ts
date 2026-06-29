import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";
const SIGNED_URL_TTL_SECONDS = 1800; // 30 minutes

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: submission, error } = await supabase
    .from("photo_submissions")
    .select("storage_keys, practitioner_ref, session_ref, submitted_at, photo_count")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  const keys = (submission.storage_keys ?? []) as string[];
  const meta = {
    practitioner_ref: submission.practitioner_ref,
    session_ref: submission.session_ref,
    submitted_at: submission.submitted_at,
    photo_count: submission.photo_count,
  };

  if (keys.length === 0) {
    return NextResponse.json({ urls: [], meta });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(keys, SIGNED_URL_TTL_SECONDS);

  if (signErr) {
    log.error("Photo view signed URL generation failed", { error: signErr.message, submissionId: id });
    return NextResponse.json({ error: "Failed to generate photo URLs" }, { status: 500 });
  }

  return NextResponse.json({
    urls: (signed ?? []).map((s) => s.signedUrl).filter(Boolean),
    meta,
  });
}
