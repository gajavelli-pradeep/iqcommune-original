import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { timingSafeEqual } from "crypto";

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

// Vercel Cron calls this via POST — GET is kept for backwards compat with older Vercel configs.
export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }

async function handler(req: NextRequest) {
  // Timing-safe comparison prevents timing-oracle attacks on the secret.
  const cronSecret = process.env.CRON_SECRET ?? "";
  const received   = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  const secretBuf  = Buffer.from(cronSecret, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  const valid =
    secretBuf.length > 0 &&
    secretBuf.length === receivedBuf.length &&
    timingSafeEqual(secretBuf, receivedBuf);

  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today    = new Date().toISOString().split("T")[0];

  const { data: expired, error } = await supabase
    .from("photo_submissions")
    .select("id, storage_keys")
    .eq("status", "Pending")
    .lte("expiry_date", today);

  if (error) {
    log.error("Expire-photos cron query failed", { error: error.message });
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!expired?.length) {
    return NextResponse.json({ expired: 0 });
  }

  const ids = expired.map((r) => r.id as string);

  // DB update FIRST — if storage delete fails the rows are already marked Expired
  // and will not be re-processed on the next cron run.
  const { error: updateErr } = await supabase
    .from("photo_submissions")
    .update({ status: "Expired" })
    .in("id", ids);

  if (updateErr) {
    log.error("Cron: batch expire update failed", { error: updateErr.message, count: ids.length });
    return NextResponse.json({ error: "Batch update failed" }, { status: 500 });
  }

  // Delete storage objects best-effort — orphaned files are benign (no public access)
  // and can be cleaned via Supabase dashboard if needed.
  for (const row of expired) {
    const keys = (row.storage_keys ?? []) as string[];
    if (keys.length > 0) {
      const { error: storageErr } = await supabase.storage.from(BUCKET).remove(keys);
      if (storageErr) {
        log.error("Cron: storage delete failed — files orphaned, DB is correct", {
          error: storageErr.message,
          id: row.id,
        });
      }
    }
  }

  log.info("Photo expiry cron complete", { expired: ids.length });
  return NextResponse.json({ expired: ids.length });
}
