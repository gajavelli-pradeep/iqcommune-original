/**
 * One-time setup script: creates or promotes a Supabase user to super_admin.
 *
 * Usage:
 *   node scripts/provision_super_admin.mjs <email> <password>
 *
 * If <email> already exists in Supabase Auth, the script promotes them to
 * super_admin without touching their password. If they don't exist, a new
 * confirmed account is created with the given password.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or from the environment if the file isn't present).
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Make sure .env.local exists or the env vars are exported."
  );
  process.exit(1);
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error(
    "Usage: node scripts/provision_super_admin.mjs <email> <password>\n" +
      "Example: node scripts/provision_super_admin.mjs superadmin@iqcommune.in MyStr0ngPass!"
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("❌  Password must be at least 8 characters.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Provision
// ---------------------------------------------------------------------------
const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listErr) {
  console.error("❌  Could not list users:", listErr.message);
  process.exit(1);
}

const existing = listData.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (existing) {
  // Promote existing user — preserve any other app_metadata fields
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    app_metadata: { ...existing.app_metadata, role: "super_admin" },
  });
  if (error) {
    console.error("❌  Failed to promote user:", error.message);
    process.exit(1);
  }
  console.log(`✅  Promoted existing user "${email}" to super_admin.`);
  console.log(`    They can now sign in at /super-login with their existing password.`);
  console.log(`    (Password was NOT changed — pass a new one to update it separately)`);
} else {
  // Create brand-new confirmed user
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "super_admin" },
  });
  if (error) {
    console.error("❌  Failed to create user:", error.message);
    process.exit(1);
  }
  console.log(`✅  Created super admin account: ${email}`);
  console.log(`    Sign in at /super-login with the password you just set.`);
}
