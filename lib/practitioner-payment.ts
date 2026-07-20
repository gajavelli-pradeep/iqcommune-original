import { decryptOptional } from "@/lib/encrypt";

// Payment fields encrypted at rest (see app/api/applications/route.ts). The admin
// console needs the plaintext to actually pay practitioners, so decrypt on read
// (server-side, admin-only) before handing rows to the client.
const ENCRYPTED_PAYMENT_FIELDS = [
  "upi_id",
  "bank_name",
  "bank_account",
  "ifsc",
  // Tax identity — the V6 practitioner profile shows PAN / GST / Invoice name, and
  // Finance needs the plaintext to raise invoices. Server-side + admin-gated, same
  // as the bank fields above.
  "pan_gst",
  "family_upi",
  "family_bank",
  "family_ifsc",
] as const;

/** Returns a shallow copy with any present encrypted payment fields decrypted. */
export function decryptPaymentFields<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const field of ENCRYPTED_PAYMENT_FIELDS) {
    if (typeof out[field] === "string") out[field] = decryptOptional(out[field] as string);
  }
  return out as T;
}
