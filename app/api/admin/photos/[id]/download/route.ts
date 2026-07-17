import { NextRequest, NextResponse } from "next/server";
import { requireViewer } from "@/lib/supabase/require-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildZip, type ZipEntry } from "@/lib/zip";
import { log } from "@/lib/logger";

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

/** Extension from a storage key, defaulting to jpg. Keys look like ".../uuid.png". */
function extOf(key: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(key);
  return m ? m[1].toLowerCase() : "jpg";
}

/** Make a session ref safe as a filename component (refs contain "/", e.g. IQC/2025/003). */
function safeName(ref: string): string {
  return ref.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "photos";
}

/**
 * Stream every photo in a submission as one ZIP.
 *
 * Replaces the old per-file client download, where an <a download> pointing at a
 * cross-origin signed URL silently dropped files in a navigation race. One
 * same-origin attachment removes that failure mode entirely — and lets a failed
 * object read return a real 500 instead of a quietly short archive.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // View/download is a User-tier capability — allow any console viewer.
  const denied = await requireViewer();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: submission, error } = await supabase
    .from("photo_submissions")
    .select("storage_keys, session_ref")
    .eq("id", id)
    .single();

  if (error || !submission) {
    return NextResponse.json({ error: "Photo submission not found" }, { status: 404 });
  }

  const keys = (submission.storage_keys ?? []) as string[];
  if (keys.length === 0) {
    return NextResponse.json({ error: "This submission has no photo files." }, { status: 404 });
  }

  // Read every object server-side. A single failure aborts with 500 rather than
  // producing a ZIP that is quietly missing photos.
  const entries: ZipEntry[] = [];
  for (let i = 0; i < keys.length; i++) {
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(keys[i]);
    if (dlErr || !blob) {
      log.error("Photo ZIP: object download failed", { error: dlErr?.message, submissionId: id, key: keys[i] });
      return NextResponse.json({ error: "Failed to read one or more photos. Please try again." }, { status: 500 });
    }
    entries.push({
      name: `iqcommune-photo-${i + 1}.${extOf(keys[i])}`,
      data: new Uint8Array(await blob.arrayBuffer()),
    });
  }

  const zip = buildZip(entries);
  const filename = `${safeName(submission.session_ref)}-photos.zip`;

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "no-store",
    },
  });
}
