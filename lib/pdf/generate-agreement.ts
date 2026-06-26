import { generateAgreementPdf, type AgreementPdfData } from "./agreement-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "agreements";

export async function generateAndStoreAgreementPdf(data: AgreementPdfData): Promise<string> {
  const buffer = generateAgreementPdf(data);

  const supabase = createAdminClient();
  // Deterministic path — same ref always writes to the same location.
  // upsert: true on the upload handles re-signs without orphaning old files.
  const storagePath = `IQC-EMP-${data.ref}/agreement.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (error) throw new Error(`PDF storage failed: ${error.message}`);
  return storagePath;
}
