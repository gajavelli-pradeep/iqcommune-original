import { NextRequest, NextResponse } from "next/server";
import { ApplicationSchema } from "@/lib/schemas/application";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
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

  const { count } = await supabase
    .from("practitioners")
    .select("*", { count: "exact", head: true });

  const refCode = String((count ?? 0) + 1).padStart(4, "0");

  const { data, error } = await supabase
    .from("practitioners")
    .insert({
      name: `${d.firstName} ${d.lastName}`,
      email: d.email,
      phone: d.phone,
      role: d.role,
      org: d.org ?? null,
      experience: d.experience,
      city: d.city,
      modules: d.modules,
      teach_freq: d.teachFreq,
      why: d.why,
      upi_id: d.upiId ?? null,
      bank_name: d.bankName ?? null,
      bank_account: d.bankAccount ?? null,
      ifsc: d.ifsc ?? null,
      pay_to_family: d.payToFamily,
      family_name: d.familyName ?? null,
      family_relation: d.familyRelation ?? null,
      family_upi: d.familyUpi ?? null,
      family_ifsc: d.familyIfsc ?? null,
      ref_code: refCode,
      status: "Applied",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[POST /api/applications]", error.message);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An application with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  const row = data as PractitionerRow;
  return NextResponse.json({ id: row.id, refCode: row.ref_code }, { status: 201 });
}
