import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const VALID_STATUSES = ["Pending", "Paid"] as const;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = new URL(req.url).searchParams.get("status");
  const supabase = createAdminClient();

  let query = supabase
    .from("payouts")
    .select("*, session:sessions(ref_code, module), practitioner:practitioners(name)")
    .order("created_at", { ascending: false });

  if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    log.error("Payouts GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
  }
  return NextResponse.json({ data });
}
