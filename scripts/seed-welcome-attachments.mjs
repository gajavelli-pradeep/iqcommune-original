#!/usr/bin/env node
/**
 * Seeds the three V8 welcome flyers into the email attachment library
 * (migration 0022). They arrive attached on every welcome email; a global admin
 * can delete them from the dialog.
 *
 * Idempotent: a flyer already saved — even a soft-deleted one — is skipped, so
 * re-running never resurrects a deliberate delete.
 *
 * Usage (reads .env.local for the Supabase keys):
 *   node --env-file=.env.local scripts/seed-welcome-attachments.mjs <folder-with-the-3-pngs>
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

const FLYERS = [
  { file: "practitioner_dos_donts_flyer.png", label: "Dos & Don'ts" },
  { file: "practitioner_pride_flyer.png", label: "Practitioner Pride" },
  { file: "session_standee.png", label: "Session Standee" },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const folder = process.argv[2];
if (!url || !key || !folder) {
  console.error("Usage: node --env-file=.env.local scripts/seed-welcome-attachments.mjs <folder>");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

for (const { file, label } of FLYERS) {
  const { data: existing } = await supabase
    .from("email_attachments")
    .select("id, deleted_at")
    .eq("label", label)
    .eq("default_for_welcome", true)
    .maybeSingle();
  if (existing) {
    console.log(`= ${label}: already saved${existing.deleted_at ? " (deleted — restore by SQL)" : ""}`);
    continue;
  }

  const bytes = readFileSync(join(folder, file));
  const storagePath = `seed-${file}`;
  const { error: uploadError } = await supabase.storage
    .from("email-attachments")
    .upload(storagePath, bytes, { contentType: "image/png", upsert: true });
  if (uploadError) throw new Error(`${file}: ${uploadError.message}`);

  const { error } = await supabase.from("email_attachments").insert({
    label,
    file_name: file,
    storage_path: storagePath,
    content_type: "image/png",
    size_bytes: bytes.byteLength,
    uploaded_by_email: null,
    default_for_welcome: true,
  });
  if (error) throw new Error(`${file}: ${error.message}`);
  console.log(`+ ${label}: ${Math.round(bytes.byteLength / 1024)} KB`);
}
