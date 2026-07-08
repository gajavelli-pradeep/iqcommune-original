import { NextRequest, NextResponse } from "next/server";
import { requireGlobalAdmin } from "@/lib/supabase/require-global-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Read-only activity feed for the Global Admin. Paginated + filterable by
// actor email, action, record table, and date range. No write/delete methods
// exist on this table — the log is tamper-proof by design.
export async function GET(req: NextRequest) {
  const denied = await requireGlobalAdmin();
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

  let query = createAdminClient()
    .from("admin_audit_log")
    .select("id, actor_email, actor_role, action, record_table, record_id, snapshot, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const actor = sp.get("actor");
  const action = sp.get("action");
  const table = sp.get("table");
  const from = sp.get("from");
  const to = sp.get("to");
  if (actor)  query = query.ilike("actor_email", `%${actor}%`);
  if (action) query = query.eq("action", action);
  if (table)  query = query.eq("record_table", table);
  if (from)   query = query.gte("created_at", from);
  if (to)     query = query.lte("created_at", to);

  const { data, error, count } = await query;
  if (error) {
    log.error("Activity log read failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset });
}
