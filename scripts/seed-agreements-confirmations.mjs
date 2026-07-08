import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const NOW = "2026-07-08T10:00:00Z";

// --- ensure the agreements storage bucket exists ---
const { data: buckets } = await db.storage.listBuckets();
if (!buckets.some((b) => b.name === "agreements")) {
  const { error } = await db.storage.createBucket("agreements", { public: false });
  console.log("created bucket agreements:", error?.message ?? "ok");
} else console.log("bucket agreements: exists");

// --- fetch practitioners + sessions to reference ---
const { data: pracs } = await db.from("practitioners").select("id, name, role, ref_code, modules").is("deleted_at", null).limit(20);
const { data: sess } = await db.from("sessions").select("id, ref_code, module, practitioner_id, session_date").is("deleted_at", null).limit(20);
if (!pracs?.length) { console.log("no practitioners — abort"); process.exit(0); }

function pdfBytes(title, lines) {
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text("IQCommune", 20, 24);
  doc.setFontSize(13); doc.text(title, 20, 38);
  doc.setFontSize(10); lines.forEach((t, i) => doc.text(t, 20, 52 + i * 8));
  return Buffer.from(doc.output("arraybuffer"));
}

// --- seed 3 Active, downloadable agreements ---
let agr = 0;
for (let i = 0; i < Math.min(3, pracs.length); i++) {
  const p = pracs[i];
  const ref = `IQC-EMP-90${String(i + 1).padStart(2, "0")}`;
  const { data: existing } = await db.from("agreements").select("id").eq("ref_code", ref).maybeSingle();
  if (existing) { console.log(`agreement ${ref}: exists, skip`); continue; }
  const module = (p.modules && p.modules[0]) || "Personal Finance";
  const path = `${ref}.pdf`;
  const bytes = pdfBytes("Empanelment Agreement", [
    `Practitioner: ${p.name}`, `Reference: ${ref}`, `Module: ${module}`,
    `Signed on: 12 Jun 2026`, `Method: typed`, `Status: Active`,
  ]);
  const up = await db.storage.from("agreements").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) { console.log(`upload ${path} failed:`, up.error.message); continue; }
  const ins = await db.from("agreements").insert({
    practitioner_id: p.id, ref_code: ref, module, signed_at: "2026-06-12T10:30:00Z",
    signature_method: "typed", status: "Active", storage_path: path,
  });
  console.log(`agreement ${ref}:`, ins.error?.message ?? "inserted + PDF uploaded"); if (!ins.error) agr++;
}

// --- seed 2 confirmations (Session Consent): Awaiting + Received ---
// net = gross * (1 - tds% + gst%)   [V4 handoff §4.3]
function net(gross, tds, gst) { return Math.round(gross * (1 - tds / 100 + gst / 100)); }
let cnf = 0;
const eligible = (sess ?? []).filter((s) => s.practitioner_id);
for (let i = 0; i < Math.min(2, eligible.length); i++) {
  const s = eligible[i];
  const { data: live } = await db.from("confirmations").select("id").eq("session_id", s.id).is("deleted_at", null).neq("status", "Superseded").maybeSingle();
  if (live) { console.log(`confirmation for ${s.ref_code}: live exists, skip`); continue; }
  const p = pracs.find((x) => x.id === s.practitioner_id) ?? pracs[0];
  const ref = `IQC-CNF-90000${i + 1}`;
  const gross = 10000 + i * 2000, tds = 10, gst = 18, n = net(gross, tds, gst);
  const received = i === 0;
  const snapshot = {
    practitioner_name: p.name, session_ref: s.ref_code, module: s.module,
    session_date: s.session_date, gross_amount: gross, tds_rate: tds, gst_rate: gst, net_amount: n,
  };
  const ins = await db.from("confirmations").insert({
    ref_code: ref, session_id: s.id, practitioner_id: p.id, session_ref: s.ref_code,
    gross_amount: gross, tds_rate: tds, gst_rate: gst, net_amount: n, snapshot,
    consent_link: `${env.NEXT_PUBLIC_APP_URL ?? "https://iqcommune.com"}/consent/${ref}`,
    status: received ? "Consent received" : "Awaiting consent",
    signed_at: received ? "2026-07-07T09:15:00Z" : null,
    signature_method: received ? "typed" : null,
    signature_data: received ? p.name : null,
    issued_on: NOW,
  });
  console.log(`confirmation ${ref} (${received ? "Received" : "Awaiting"}):`, ins.error?.message ?? "inserted"); if (!ins.error) cnf++;
}
console.log(`\nDONE — agreements added: ${agr}, confirmations added: ${cnf}`);
