import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM authenticated encryption for sensitive payment fields.
// Stored format: "<iv_hex>:<tag_hex>:<ciphertext_hex>"
// ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes).

const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length !== 64)
    throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return Buffer.from(k, "hex");
}

export function encrypt(plaintext: string): string {
  const iv       = randomBytes(12);
  const cipher   = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  const decipher = createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

/** Encrypts only when the value is a non-empty string; returns null otherwise. */
export function encryptOptional(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return encrypt(value);
}
