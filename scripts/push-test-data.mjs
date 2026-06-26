// Push test data + verify data layer for the admin console interaction cross-check.
// Usage: node --env-file=.env.local scripts/push-test-data.mjs
//
// NOTE: All fixture IDs are valid RFC-4122 v4 UUIDs (version nibble = 4, variant = 8).
// The API validates `assignedTo` with Zod v4 `.uuid()`, which REJECTS non-conformant
// UUIDs (e.g. all-zero test ids) — using invalid ids makes the "Assign practitioner"
// dropdown silently 400. Keep these conformant.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);

// Valid v4 UUID fixtures
const REQ_1 = "00000000-0000-4000-8000-000000000016";
const REQ_2 = "00000000-0000-4000-8000-000000000017";
const PR_APPLIED = "00000000-0000-4000-8000-000000000021";
const PR_SCREEN = "00000000-0000-4000-8000-000000000023";
const EMP_ID = "00000000-0000-4000-8000-000000000025";
const SES_1 = "00000000-0000-4000-8000-000000000071";
const SES_2 = "00000000-0000-4000-8000-000000000072";
const PO_1 = "00000000-0000-4000-8000-000000000081";
const PO_2 = "00000000-0000-4000-8000-000000000082";
const AG_1 = "00000000-0000-4000-8000-000000000091";

// 1) Connectivity + current counts
const tables = ["practitioners", "sessions", "session_requests", "payouts", "agreements"];
log("=== Current row counts ===");
for (const t of tables) {
  const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
  log(`${t.padEnd(18)} ${error ? "ERROR: " + error.message : count}`);
}

// 1b) Remove previously-seeded non-conformant-UUID rows (FK-safe order). Idempotent.
const OLD = {
  payouts: ["00000000-0000-0000-0008-000000000001", "00000000-0000-0000-0008-000000000002"],
  agreements: ["00000000-0000-0000-0009-000000000001"],
  sessions: ["00000000-0000-0000-0007-000000000001", "00000000-0000-0000-0007-000000000002"],
  session_requests: ["00000000-0000-0000-0001-000000000006", "00000000-0000-0000-0001-000000000007"],
  practitioners: ["00000000-0000-0000-0002-000000000001", "00000000-0000-0000-0003-000000000003", "00000000-0000-0000-0005-000000000005"],
};
log("\n=== Cleaning old non-conformant fixtures ===");
for (const t of ["payouts", "agreements", "sessions", "session_requests", "practitioners"]) {
  const { error } = await db.from(t).delete().in("id", OLD[t]);
  log(`${t.padEnd(18)} ${error ? "ERROR: " + error.message : "cleaned"}`);
}

// 2) Push test data (idempotent upserts)
log("\n=== Pushing test data ===");
const reqs = [
  { id: REQ_1, name: "Arjun Patel", org: "Google India", email: "arjun.patel@google.com", phone: "+91 98765 43215", topic: "Retirement Planning Essentials", audience_type: "All staff", group_size: "25-40", min_commit: 25, venue: null, preferred_dates: "Flexible — any date Aug", status: "New" },
  { id: REQ_2, name: "Kavya Iyer", org: "Deloitte India", email: "kavya.iyer@deloitte.com", phone: "+91 98765 43216", topic: "Insurance & Risk Coverage", audience_type: "Mid to senior staff", group_size: "30-45", min_commit: 20, venue: "Delhi NCR office", preferred_dates: "August 5-9, 2025", status: "New" },
];
const { error: reqErr } = await db.from("session_requests").upsert(reqs, { onConflict: "id" });
log("session_requests upsert:", reqErr ? "ERROR: " + reqErr.message : "ok (" + reqs.length + ")");

const prs = [
  { id: PR_APPLIED, name: "Dr. Meena Krishnan", email: "meena.krishnan@example.com", phone: "+91 99887 76650", role: "Certified Financial Planner", org: "Independent", city: "Bangalore", experience: "12 years", modules: ["Foundations of Personal Finance", "Asset Allocation & Portfolio Construction"], status: "Applied", why: "Democratise financial literacy.", consent_operational: true, consent_nosell: true, consent_employer: true, ref_code: "MK001" },
  { id: PR_SCREEN, name: "Deepa Venkataraman", email: "deepa.v@example.com", phone: "+91 99887 76652", role: "CA & Financial Coach", org: "Self-employed", city: "Chennai", experience: "15 years", modules: ["Debt & Fixed Income Investing"], status: "Screening Done", why: "Help people reduce financial stress.", consent_operational: true, consent_nosell: true, consent_employer: true, ref_code: "DV003" },
  { id: EMP_ID, name: "Lakshmi Subramaniam", email: "lakshmi.s@example.com", phone: "+91 99887 76654", role: "Personal Finance Educator", org: "Independent", city: "Hyderabad", experience: "7 years", modules: ["Foundations of Personal Finance", "Retirement & Goal-Based Financial Planning"], status: "Empanelled", why: "Every rupee saved today is freedom tomorrow.", consent_operational: true, consent_nosell: true, consent_employer: true, ref_code: "LS005", upi_id: "lakshmi.s@upi", bank_name: "HDFC Bank", bank_account: "50100123456789", ifsc: "HDFC0001234" },
];
const { error: prErr } = await db.from("practitioners").upsert(prs, { onConflict: "id" });
log("practitioners upsert:", prErr ? "ERROR: " + prErr.message : "ok (" + prs.length + ")");

const sessions = [
  { id: SES_1, ref_code: "IQC-SES-0001", module: "Foundations of Personal Finance", practitioner_id: EMP_ID, session_date: "2026-07-20", start_time: "10:00", end_time: "13:00", venue: "Hyderabad HQ", audience_type: "Corporate employees", participants: 35, payout_amount: 15000, tds_applicable: true, tds_rate: 10, consent_status: "Pending consent", status: "Upcoming" },
  { id: SES_2, ref_code: "IQC-SES-0002", module: "Retirement & Goal-Based Financial Planning", practitioner_id: EMP_ID, session_date: "2026-06-01", start_time: "14:00", end_time: "17:00", venue: "Pune campus", audience_type: "All staff", participants: 50, payout_amount: 20000, tds_applicable: true, tds_rate: 10, consent_status: "Consent given", status: "Completed" },
];
const { error: sesErr } = await db.from("sessions").upsert(sessions, { onConflict: "id" });
log("sessions upsert:", sesErr ? "ERROR: " + sesErr.message : "ok (" + sessions.length + ")");

const payouts = [
  { id: PO_1, session_id: SES_1, practitioner_id: EMP_ID, invoice_ref: "INV-0001", gross_amount: 15000, net_amount: 13500, status: "Pending" },
  { id: PO_2, session_id: SES_2, practitioner_id: EMP_ID, invoice_ref: "INV-0002", gross_amount: 20000, net_amount: 18000, status: "Paid", payment_method: "NEFT", paid_at: new Date().toISOString() },
];
const { error: poErr } = await db.from("payouts").upsert(payouts, { onConflict: "id" });
log("payouts upsert:", poErr ? "ERROR: " + poErr.message : "ok (" + payouts.length + ")");

const agreements = [
  { id: AG_1, practitioner_id: EMP_ID, ref_code: "LS005", module: "Foundations of Personal Finance", signed_at: new Date().toISOString(), signature_method: "typed", status: "Active", storage_path: null },
];
const { error: agErr } = await db.from("agreements").upsert(agreements, { onConflict: "id" });
log("agreements upsert:", agErr ? "ERROR: " + agErr.message : "ok (" + agreements.length + ")");

// 3) Round-trip test: simulate the admin-console interaction (status PATCH)
log("\n=== Round-trip interaction test (mirrors what the UI PATCH does) ===");
const { data: before } = await db.from("practitioners").select("status").eq("id", PR_APPLIED).single();
const newStatus = before?.status === "Under Review" ? "Applied" : "Under Review";
const { error: upErr } = await db.from("practitioners").update({ status: newStatus }).eq("id", PR_APPLIED);
const { data: after } = await db.from("practitioners").select("status").eq("id", PR_APPLIED).single();
log(`practitioner status: ${before?.status} -> requested ${newStatus} -> now ${after?.status}`,
    upErr ? "ERROR: " + upErr.message : (after?.status === newStatus ? "PERSISTED ✓" : "DID NOT PERSIST ✗"));
await db.from("practitioners").update({ status: before?.status }).eq("id", PR_APPLIED);

log("\nDone.");
