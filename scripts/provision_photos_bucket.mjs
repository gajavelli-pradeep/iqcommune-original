/**
 * One-time setup script: creates the Supabase Storage bucket used for session
 * photo submissions. Storage buckets are NOT created by SQL migrations, so this
 * must be run once per environment (or created by hand in the dashboard).
 *
 * Usage:
 *   node scripts/provision_photos_bucket.mjs
 *
 * The bucket is created PRIVATE (photos are served to admins via short-lived
 * signed URLs), with a 25 MB per-file limit and JPEG/PNG only — matching the
 * limits enforced in app/api/photo-submissions/route.ts. Idempotent: if the
 * bucket already exists it just reconciles those settings.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and (optionally)
 * SUPABASE_PHOTOS_BUCKET from .env.local (or the environment).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
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
const BUCKET =
  dotenv.SUPABASE_PHOTOS_BUCKET ?? process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Make sure .env.local exists or the env vars are exported."
  );
  process.exit(1);
}

// Must match app/api/photo-submissions/route.ts (MAX_FILE_BYTES + isMimeAllowed).
const BUCKET_CONFIG = {
  public: false,
  fileSizeLimit: 25 * 1024 * 1024, // 25 MB
  allowedMimeTypes: ["image/jpeg", "image/png"],
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Provision (idempotent)
// ---------------------------------------------------------------------------
const { data: existing } = await supabase.storage.getBucket(BUCKET);

if (existing) {
  const { error } = await supabase.storage.updateBucket(BUCKET, BUCKET_CONFIG);
  if (error) {
    console.error(`❌  Bucket "${BUCKET}" exists but could not be reconciled:`, error.message);
    process.exit(1);
  }
  console.log(`✅  Bucket "${BUCKET}" already existed — settings reconciled (private, 25 MB, JPEG/PNG).`);
} else {
  const { error } = await supabase.storage.createBucket(BUCKET, BUCKET_CONFIG);
  if (error) {
    console.error(`❌  Failed to create bucket "${BUCKET}":`, error.message);
    process.exit(1);
  }
  console.log(`✅  Created private Storage bucket "${BUCKET}" (25 MB per file, JPEG/PNG only).`);
}

console.log(`    SUPABASE_PHOTOS_BUCKET must equal "${BUCKET}" in every environment (local + Vercel).`);
