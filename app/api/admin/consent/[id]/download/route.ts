import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

// Signed download of a confirmation's generated consent PDF (V4: per-row "PDF").
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const db = createAdminClient();

  const { data: confirmation, error } = await db
    .from("confirmations")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !confirmation) {
    return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
  }

  if (!confirmation.storage_path) {
    return NextResponse.json({ error: "No PDF available for this confirmation" }, { status: 404 });
  }

  const { data: signedData, error: signedError } = await db.storage
    .from("confirmations")
    .createSignedUrl(confirmation.storage_path, 3600);

  if (signedError || !signedData) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.json({ url: signedData.signedUrl });
}
