import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

// Vercel Cron calls this daily (see vercel.json). Hard-deletes rows that were
// soft-deleted more than the grace window ago via the SQL purge function.
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

  const { data, error } = await createAdminClient().rpc("purge_soft_deleted");
  if (error) {
    log.error("Purge-soft-deleted cron failed", { error: error.message });
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }

  const total = (data ?? []).reduce((sum, r) => sum + (r.purged ?? 0), 0);
  log.info("Soft-delete purge complete", { total, breakdown: data });
  return NextResponse.json({ purged: total, breakdown: data ?? [] });
}
