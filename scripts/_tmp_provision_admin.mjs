// Throwaway: provisions / deletes a temp admin user for local testing.
// Usage: node scripts/_tmp_provision_admin.mjs create | delete
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load env from .env.local manually (no dotenv dependency assumed).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = "test-admin@iqcommune.in";
const PASSWORD = "TestAdmin!2026provision";

const action = process.argv[2];

async function findUser() {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === EMAIL);
}

if (action === "create") {
  const existing = await findUser();
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    console.log("UPDATED " + existing.id);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) throw error;
    console.log("CREATED " + data.user.id);
  }
  console.log("LOGIN " + EMAIL + " / " + PASSWORD);
} else if (action === "delete") {
  const existing = await findUser();
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id);
    if (error) throw error;
    console.log("DELETED " + existing.id);
  } else {
    console.log("NOT_FOUND");
  }
} else {
  console.log("usage: node scripts/_tmp_provision_admin.mjs create|delete");
  process.exit(1);
}
