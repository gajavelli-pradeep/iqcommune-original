import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

const SAFE_KEYS: (keyof PractitionerRow)[] = [
  "id",
  "name",
  "email",
  "phone",
  "role",
  "org",
  "city",
  "experience",
  "modules",
  "teach_freq",
  "why",
  "status",
  "ref_code",
  "pay_to_family",
  "consent_operational",
  "consent_nosell",
  "consent_employer",
  "created_at",
  "updated_at",
];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("practitioners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Strip bank / payment fields from list response — full data available via /[id]
  const safe = (data as PractitionerRow[]).map((p) =>
    Object.fromEntries(SAFE_KEYS.map((k) => [k, p[k]]))
  );

  return NextResponse.json({ data: safe });
}
