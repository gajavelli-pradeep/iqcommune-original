import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Encrypted store of the most recent password a Global Admin SET for an account
// (admin or super_admin), so it can be revealed/copied to hand over. Overwritten
// on each change. Encryption key is derived from the app's HMAC secret, so a bare
// DB dump alone cannot decrypt — only the running app can. Rotating HMAC_SECRET
// makes existing stored passwords undecryptable (just re-set them).

function key(): Buffer {
  const secret = process.env.HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("HMAC_SECRET missing or too short (min 32 chars)");
  }
  // Distinct info string so this key can't collide with HMAC signing use.
  return crypto.createHash("sha256").update(`iqcommune-admin-pw-vault:${secret}`).digest();
}

// Returns "ivHex:tagHex:ciphertextHex".
function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

function decrypt(payload: string): string {
  const [ivHex, tagHex, ctHex] = payload.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("Malformed cipher payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
}

/** Upsert the latest SA-set password for a user (overwrites the previous one). */
export async function storeAdminPassword(userId: string, plain: string, setBy: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("admin_credentials")
    .upsert(
      { user_id: userId, password_cipher: encrypt(plain), set_by: setBy, set_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    // Non-fatal: the auth password change already succeeded; the vault copy is a convenience.
    log.error("Admin password vault write failed", { userId, error: error.message });
  }
}

/** Read the current SA-set password for a user, or null if none is stored. */
export async function getAdminPassword(
  userId: string
): Promise<{ password: string; setBy: string; setAt: string } | null> {
  const { data, error } = await createAdminClient()
    .from("admin_credentials")
    .select("password_cipher, set_by, set_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    log.error("Admin password vault read failed", { userId, error: error.message });
    return null;
  }
  if (!data) return null;
  try {
    return { password: decrypt(data.password_cipher), setBy: data.set_by, setAt: data.set_at };
  } catch (e) {
    log.error("Admin password decrypt failed", { userId, error: String(e) });
    return null;
  }
}
