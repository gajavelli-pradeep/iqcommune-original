/**
 * Mints a real tokenised link for each flow page, so the audit can visit the
 * ACTUAL pages rather than a mock of them.
 *
 * The five emailed pages (rate, consent, photos, onboarding, join-admin) are
 * unreachable without a signed `t`, which is the point of ADR 0004. A preview
 * harness rendering them with fake props would audit the harness, not the page
 * — so this signs a token the same way the app does and picks a live row for
 * each kind out of the database.
 *
 * Prints one URL per line as `<name> <url>`; the token is short-lived.
 *
 * Usage: node --env-file=.env.local scripts/mint-preview-tokens.mjs
 */
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const TTL_SECONDS = 900;

const encode = (value) => Buffer.from(value).toString("base64url");

function mint(kind, id) {
  const secret = process.env.HMAC_SECRET;
  if (!secret) throw new Error("Missing HMAC_SECRET");
  const payload = encode(JSON.stringify({ k: kind, id, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }));
  return `${payload}.${encode(createHmac("sha256", secret).update(payload).digest())}`;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const first = async (table, select, filters = (query) => query) => {
  const { data } = await filters(supabase.from(table).select(select)).limit(1).maybeSingle();
  return data;
};

// Each page resolves a different row, so each token names a different table.
const assignment = await first("session_practitioners", "id", (q) => q.is("deleted_at", null));
const agreement = await first("practitioner_agreements", "id", (q) => q.is("deleted_at", null));
const invite = await first("admin_invites", "id", (q) =>
  q.is("consumed_at", null).is("deleted_at", null),
);

const links = [
  assignment && ["rate", `/rate?t=${mint("rate", assignment.id)}`],
  assignment && ["consent", `/consent?t=${mint("consent", assignment.id)}`],
  assignment && ["submit-photos", `/submit-photos?t=${mint("photos", assignment.id)}`],
  agreement && ["onboarding", `/onboarding?t=${mint("onboarding", agreement.id)}`],
  invite && ["join-admin", `/join-admin?t=${mint("invite", invite.id)}`],
].filter(Boolean);

for (const [name, path] of links) console.log(`${name} ${path}`);
if (links.length < 5) console.error(`only ${links.length}/5 — some tables have no live row`);
