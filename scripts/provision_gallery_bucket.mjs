/**
 * One-time setup: creates the PUBLIC Storage bucket for the homepage
 * "Sessions in the room" gallery. Unlike session photos (private, signed URLs),
 * these are marketing images served publicly and cached, so the bucket is public.
 *
 * Usage:
 *   node scripts/provision_gallery_bucket.mjs
 *
 * Idempotent: re-running just reconciles the settings. Bucket name is "gallery"
 * (must match GALLERY_BUCKET in the API routes).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([^#=\s][^=]*)=(.*)$/);
      if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const dotenv = loadDotEnv();
const SUPABASE_URL =
  dotenv.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  dotenv.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Make sure .env.local exists or the env vars are exported."
  );
  process.exit(1);
}

const BUCKET = "gallery";
const BUCKET_CONFIG = {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await supabase.storage.getBucket(BUCKET);

if (existing) {
  const { error } = await supabase.storage.updateBucket(BUCKET, BUCKET_CONFIG);
  if (error) {
    console.error(`❌  Bucket "${BUCKET}" exists but could not be reconciled:`, error.message);
    process.exit(1);
  }
  console.log(`✅  Bucket "${BUCKET}" already existed — settings reconciled (public, 5 MB, JPEG/PNG/WebP).`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, BUCKET_CONFIG);
  if (error) {
    console.error(`❌  Failed to create bucket "${BUCKET}":`, error.message);
    process.exit(1);
  }
  console.log(`✅  Created public Storage bucket "${BUCKET}" (5 MB per file, JPEG/PNG/WebP).`);
}
