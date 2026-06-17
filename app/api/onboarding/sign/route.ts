import { NextRequest, NextResponse } from "next/server";
import { AgreementSignSchema } from "@/lib/schemas/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AgreementSignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ref, fullName, designation, sigMode, sigData } = parsed.data;
  const supabase = createAdminClient();

  const { data, error: fetchErr } = await supabase
    .from("agreements")
    .select("*")
    .eq("ref_code", ref)
    .single();

  if (fetchErr || !data) {
    return NextResponse.json({ error: "Invalid agreement reference" }, { status: 403 });
  }

  const agreement = data as AgreementRow;

  if (agreement.status === "Active") {
    return NextResponse.json({ error: "Agreement already signed" }, { status: 409 });
  }

  const ip =
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const signedAt = new Date().toISOString(); // server-side timestamp — never trust client

  const { error: updateErr } = await supabase
    .from("agreements")
    .update({
      signed_at: signedAt,
      signature_method: sigMode,
      signature_data: sigData,
      signer_ip: ip,
      status: "Active",
    })
    .eq("id", agreement.id);

  if (updateErr) {
    console.error("[POST /api/onboarding/sign]", updateErr.message);
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }

  // Promote practitioner to Empanelled
  await supabase
    .from("practitioners")
    .update({ status: "Empanelled" })
    .eq("id", agreement.practitioner_id);

  return NextResponse.json({
    timestamp: signedAt,
    refCode: ref,
    signedBy: fullName,
    designation,
  });
}
