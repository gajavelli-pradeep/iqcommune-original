import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("agreements")
    .select("id, ref_code, practitioner_id, module, signed_at, signature_method, status, storage_path")
    .order("signed_at", { ascending: false });

  if (error) {
    log.error("Agreements GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load agreements" }, { status: 500 });
  }

  const rows = (data ?? []).map((a) => ({
    id:             a.id,
    refCode:        a.ref_code,
    practitionerId: a.practitioner_id,
    module:         a.module,
    signedDate:     a.signed_at,
    signMethod:     a.signature_method,
    status:         a.status,
    hasPdf:         !!a.storage_path,
  }));

  return NextResponse.json({ data: rows });
}
