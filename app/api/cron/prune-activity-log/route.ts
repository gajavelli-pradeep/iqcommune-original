import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

// Vercel Cron calls this daily (see vercel.json). Enforces the V6 §12 90-day
// rolling retention on the Activity log via the SQL prune function.
export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }

async function handler(req: NextRequest) {
  // Timing-safe comparison prevents timing-oracle attacks on the secret.
  const cronSecret  = process.env.CRON_SECRET ?? "";
  const received    = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  const secretBuf   = Buffer.from(cronSecret, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  const valid =
    secretBuf.length > 0 &&
    secretBuf.length === receivedBuf.length &&
    timingSafeEqual(secretBuf, receivedBuf);

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc("prune_activity_log");
  if (error) {
    log.error("Prune-activity-log cron failed", { error: error.message });
    return NextResponse.json({ error: "Prune failed" }, { status: 500 });
  }

  const total = (data ?? []).reduce((sum, r) => sum + (r.purged ?? 0), 0);
  log.info("Activity-log prune complete", { total });
  return NextResponse.json({ purged: total, breakdown: data ?? [] });
}
