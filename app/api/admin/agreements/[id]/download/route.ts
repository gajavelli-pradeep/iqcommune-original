import { NextRequest, NextResponse } from "next/server";
import { requireViewer } from "@/lib/supabase/require-viewer";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Download/export is a User-tier capability — allow any console viewer.
  const denied = await requireViewer();
  if (denied) return denied;

  const { id } = await params;
  const db = createAdminClient();

  const { data: agreement, error } = await db
    .from("agreements")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !agreement) {
    return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  }

  if (!agreement.storage_path) {
    return NextResponse.json({ error: "No file available for this agreement" }, { status: 404 });
  }

  const { data: signedData, error: signedError } = await db.storage
    .from("agreements")
    .createSignedUrl(agreement.storage_path, 3600);

  if (signedError || !signedData) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: signedData.signedUrl });
}
