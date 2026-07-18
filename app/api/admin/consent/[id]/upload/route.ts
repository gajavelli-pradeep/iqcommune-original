import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

// Op-procedure Part 4 step 20: upload the practitioner's signed consent reply.
// Mirrors mark-received (confirmation -> "Consent received", session consent_status
// -> "Consent given") but also stores the uploaded file. Global-Admin only.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const deny = await requireGlobalAdmin();
  if (deny) return deny;

  const { id } = await params;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPG or PNG allowed" }, { status: 415 });
  }

  const db = createAdminClient();
  const { data: conf } = await db
    .from("confirmations")
    .select("ref_code, session_id, status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!conf) return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });

  const path = `${conf.ref_code}-signed.${EXT[file.type]}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db.storage
    .from("confirmations")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data: updated, error } = await db
    .from("confirmations")
    .update({ storage_path: path, status: "Consent received" })
    .eq("id", id)
    .select("id, status, storage_path")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("sessions").update({ consent_status: "Consent given" }).eq("id", conf.session_id);

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  await logAdminAction({
    actorEmail: user?.email ?? "unknown",
    action: "upload_signed_consent",
    recordTable: "confirmations",
    recordId: id,
    snapshot: { storage_path: path, status: "Consent received" },
  });

  return NextResponse.json({ data: updated });
}
