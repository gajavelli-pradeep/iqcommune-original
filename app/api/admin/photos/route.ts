import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const VALID_STATUSES = ["Pending", "Approved", "Rejected", "Expired"] as const;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = new URL(req.url).searchParams.get("status");
  const supabase = createAdminClient();

  let query = supabase
    .from("photo_submissions")
    .select("id, practitioner_ref, session_ref, module, city, state, submitted_at, expiry_date, photo_count, status")
    .order("submitted_at", { ascending: false });

  if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    log.error("Photo submissions GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load photo submissions" }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];
  const rows = (data ?? []).map((p) => {
    const daysLeft = p.expiry_date
      ? Math.floor(
          (new Date(p.expiry_date).getTime() - new Date(today).getTime()) / 86_400_000
        )
      : null;
    return { ...p, daysLeft, urgent: daysLeft !== null && daysLeft <= 7 };
  });

  return NextResponse.json({ data: rows });
}
