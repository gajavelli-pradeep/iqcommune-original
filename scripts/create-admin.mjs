#!/usr/bin/env node
/**
 * Bootstrap a console account (the "how do I get in the first time" step).
 *
 * V7 authorises the console from `auth.users.app_metadata.role` only — there is
 * no email backdoor (docs/ENVIRONMENT.md) and admin invites need an existing
 * admin, so the FIRST global_admin has to be created out-of-band. This does that
 * with the service-role key: it creates the auth user (email pre-confirmed) or,
 * if the email already exists, resets its password and sets the role claim.
 *
 * Usage (Node 20+, reads .env.local for the Supabase keys):
 *   node --env-file=.env.local scripts/create-admin.mjs <email> <password> [role]
 *   # or: pnpm create-admin <email> <password> [role]
 *
 * role = global_admin (default) | admin | user
 * After it prints "signed in at /login", log in there with the same credentials.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [email, password, role = "global_admin"] = process.argv.slice(2);

const die = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

if (!url || !serviceKey) {
  die(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run with:  node --env-file=.env.local scripts/create-admin.mjs <email> <password> [role]",
  );
}
if (!email || !password) {
  die("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [global_admin|admin|user]");
}
if (!["global_admin", "admin", "user"].includes(role)) {
  die(`Invalid role "${role}". Use global_admin, admin, or user.`);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findByEmail(target) {
  const wanted = target.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((user) => user.email?.toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

const existing = await findByEmail(email);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    app_metadata: { ...existing.app_metadata, role },
  });
  if (error) die(`Update failed: ${error.message}`);
  console.log(`✓ Updated ${email} → role="${role}". Sign in at /login.`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) die(`Create failed: ${error.message}`);
  console.log(`✓ Created ${email} → role="${role}". Sign in at /login.`);
}
