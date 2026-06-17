import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOnboardingUrl } from "@/lib/hmac";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { practitionerId } = await req.json();
  if (!practitionerId) {
    return NextResponse.json({ error: "practitionerId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioners")
    .select("*")
    .eq("id", practitionerId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const p = data as PractitionerRow;

  if (p.status === "Empanelled") {
    return NextResponse.json(
      { error: "Practitioner is already empanelled" },
      { status: 409 }
    );
  }

  const url = signOnboardingUrl({
    name: p.name,
    role: p.role,
    org: p.org ?? "Independent",
    module: p.modules[0] ?? "",
    city: p.city,
    ref: p.ref_code ?? "",
    email: p.email,
  });

  // Create agreement record (idempotent — upsert by ref_code)
  const refCode = `IQC-EMP-${p.ref_code}`;
  await supabase.from("agreements").upsert(
    {
      practitioner_id: practitionerId,
      ref_code: refCode,
      module: p.modules[0] ?? "",
      status: "Pending signature",
    },
    { onConflict: "ref_code" }
  );

  return NextResponse.json({ url, refCode });
}
