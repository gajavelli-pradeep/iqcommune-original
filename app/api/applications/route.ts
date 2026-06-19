import { NextRequest, NextResponse } from "next/server";
import { ApplicationSchema } from "@/lib/schemas/application";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(ip, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createAdminClient();

  // Use DB sequence for atomic, race-condition-free ref_code generation.
  const { data: refCode, error: refErr } = await supabase.rpc("next_practitioner_ref");
  if (refErr || !refCode) {
    log.error("Failed to generate practitioner ref code", { error: refErr?.message, ip });
    return NextResponse.json({ error: "Failed to generate reference code" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("practitioners")
    .insert({
      name: `${d.firstName} ${d.lastName}`,
      email: d.email,
      phone: d.phone,
      role: d.role,
      experience: d.experience,
      city: d.city,
      modules: d.modules,
      teach_freq: d.teachFreq,
      why: d.why,
      upi_id: d.upiId ?? null,
      bank_name: d.bankAccountName ?? null,
      bank_account: d.bankAccount ?? null,
      ifsc: d.ifsc ?? null,
      pay_to_family: d.payToFamily,
      family_name: d.familyName ?? null,
      family_relation: d.familyRelation ?? null,
      family_upi: d.familyUpi ?? null,
      family_bank: d.familyAccountName ?? null,
      family_ifsc: d.familyIfsc ?? null,
      ref_code: refCode as string,
      status: "Applied",
    })
    .select("id, ref_code")
    .single();

  if (error) {
    log.error("Failed to insert practitioner application", { error: error.message, code: error.code, ip });
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An application with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const row = data as Pick<PractitionerRow, "id" | "ref_code">;
  return NextResponse.json({ id: row.id, refCode: row.ref_code }, { status: 201 });
}
