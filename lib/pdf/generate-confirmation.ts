import { generateConfirmationPdf, type ConfirmationPdfData } from "./confirmation-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

// Dedicated private bucket (service-role only). Created out-of-band; see the
// consent feature notes. Falls back gracefully — callers treat PDF as non-fatal.
const BUCKET = "confirmations";

export async function generateAndStoreConfirmationPdf(data: ConfirmationPdfData): Promise<string> {
  const buffer = generateConfirmationPdf(data);
  const supabase = createAdminClient();
  // Deterministic path — regenerating (e.g. after consent) overwrites the record copy.
  const storagePath = `${data.refCode}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (error) throw new Error(`Confirmation PDF storage failed: ${error.message}`);
  return storagePath;
}
