import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAgreementPdf } from "@/lib/pdf/agreement-pdf";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Op-procedure Part 1 step 3: download the practitioner's PREFILLED (unsigned)
// agreement PDF — filled from their application — to send them for signing.
// Streams the PDF directly (no storage) since it's a throwaway pre-sign copy.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid practitioner ID" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: p, error } = await db
    .from("practitioners")
    .select("name, role, org, modules, city, state, ref_code")
    .eq("id", id)
    .single();

  if (error || !p) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const pdf = generateAgreementPdf({
    practitionerName: p.name ?? "",
    designation:      p.role ?? "",
    org:              p.org ?? "",
    module:           Array.isArray(p.modules) ? p.modules.join(", ") : (p.modules ?? ""),
    city:             p.city ?? "",
    state:            p.state ?? "",
    ref:              p.ref_code ?? "",
    // signedAt omitted → prefilled unsigned template (blank signature lines)
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="agreement-IQC-EMP-${p.ref_code ?? "draft"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
