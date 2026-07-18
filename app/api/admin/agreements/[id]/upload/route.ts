import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"]);
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };

// Op-procedure Part 2 steps 7-9: upload the signed agreement copy (drag/browse),
// optionally set the signed date + method, and mark the row Active. Stores to the
// "agreements" bucket at the row's deterministic ref path (upsert overwrites the
// prefilled copy). Global-Admin only. The signed date + method can also be edited
// afterwards via the Edit modal.
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

  const signedAtInput = String(form?.get("signedAt") ?? "").trim();
  const method = String(form?.get("method") ?? "").trim();

  const db = createAdminClient();
  const { data: row } = await db.from("agreements").select("ref_code").eq("id", id).single();
  if (!row) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

  const path = `IQC-EMP-${row.ref_code}/signed-agreement.${EXT[file.type]}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db.storage
    .from("agreements")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
  }

  // Marking Active fires the 0006 empanelment trigger; harmless if already Empanelled.
  const patch = {
    storage_path: path,
    status: "Active",
    signed_at: signedAtInput ? new Date(signedAtInput).toISOString() : new Date().toISOString(),
    signature_method: method || null,
  };
  const { data: updated, error } = await db
    .from("agreements")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  await logAdminAction({
    actorEmail: user?.email ?? "unknown",
    action: "upload_signed_agreement",
    recordTable: "agreements",
    recordId: id,
    snapshot: patch as Record<string, unknown>,
  });

  return NextResponse.json({ data: updated });
}
