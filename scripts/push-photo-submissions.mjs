// Push photo submissions test data.
// Usage: node --env-file=.env.local scripts/push-photo-submissions.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing SUPABASE env vars"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const photos = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    practitioner_ref: "LS005", session_ref: "IQC/2025/001",
    module: "Foundations of Personal Finance", city: "Hyderabad", state: "Telangana",
    submitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 28 * 86400 * 1000).toISOString().slice(0, 10),
    photo_count: 6, storage_keys: [], participant_consent: true, status: "Pending",
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    practitioner_ref: "MK001", session_ref: "IQC/2025/002",
    module: "Retirement & Goal-Based Financial Planning", city: "Bangalore", state: "Karnataka",
    submitted_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 27 * 86400 * 1000).toISOString().slice(0, 10),
    photo_count: 4, storage_keys: [], participant_consent: true, status: "Pending",
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    practitioner_ref: "SK002", session_ref: "IQC/2025/003",
    module: "Equity Investing Simplified", city: "Mumbai", state: "Maharashtra",
    submitted_at: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 25 * 86400 * 1000).toISOString().slice(0, 10),
    photo_count: 8, storage_keys: [], participant_consent: true, status: "Approved",
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    practitioner_ref: "DV003", session_ref: "IQC/2025/004",
    module: "Debt & Fixed Income Investing", city: "Chennai", state: "Tamil Nadu",
    submitted_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    expiry_date: new Date(Date.now() + 23 * 86400 * 1000).toISOString().slice(0, 10),
    photo_count: 3, storage_keys: [], participant_consent: true, status: "Rejected",
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    practitioner_ref: "RD004", session_ref: "IQC/2025/005",
    module: "Asset Allocation & Portfolio Construction", city: "Pune", state: "Maharashtra",
    submitted_at: new Date(Date.now() - 35 * 86400 * 1000).toISOString(),
    expiry_date: new Date(Date.now() - 5 * 86400 * 1000).toISOString().slice(0, 10),
    photo_count: 5, storage_keys: [], participant_consent: true, status: "Expired",
  },
];

const { error } = await db.from("photo_submissions").upsert(photos, { onConflict: "id" });
if (error) { console.error("ERROR:", error.message); process.exit(1); }
console.log(`Upserted ${photos.length} photo submissions ✓`);

const { data, error: e2 } = await db.from("photo_submissions").select("id, practitioner_ref, status");
if (!e2) console.log("Rows now in DB:", data.map(r => `${r.practitioner_ref} → ${r.status}`).join(", "));
