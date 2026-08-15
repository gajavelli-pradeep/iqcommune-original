import "server-only";

import { log } from "@/lib/logger";
import { renderSignedAgreement, type SignedAgreement } from "@/lib/pdf/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRecordedAt } from "@/lib/timestamp";

/**
 * The signed agreement, kept rather than re-made.
 *
 * The download used to render the document fresh on every press, from whichever
 * contract text was deployed at that moment. Nobody noticed while the text never
 * changed. The v2 delivery changed it — new header, platform moved into the
 * preamble, clause 13 reworded — and a re-render would have printed those terms
 * under the signature of someone who agreed to the previous ones, beside the
 * platform's own line asserting that this is what was recorded at submission.
 *
 * So the bytes are written once, at signature, and served unchanged afterwards.
 * `renderSignedAgreement` is still the only renderer; the difference is that it
 * now runs once per agreement instead of once per download.
 */

const BUCKET = "agreements";

/** One object per agreement. The id is already unique and unguessable, and the
 *  bucket is private, so nothing is gained by salting the key. */
const keyFor = (agreementId: string) => `${agreementId}.pdf`;

const dateOnly = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : null;

/**
 * Everything the document prints, from one read.
 *
 * Shared by the archive write and by the fallback render so the two cannot
 * disagree: a row archived today and a row re-rendered tomorrow are built from
 * the same query, and only the clause text can differ between them — which is
 * the whole reason the archive exists.
 */
export async function buildSignedAgreement(agreementId: string): Promise<SignedAgreement | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .select(
      "reference, issued_on, version, signed_at, signed_name, signature_mode, signed_ip, practitioners ( full_name, city, state, reference )",
    )
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`agreement read failed: ${error.message}`);
  if (!data) return null;

  const practitioner = Array.isArray(data.practitioners) ? data.practitioners[0] : data.practitioners;

  return {
    reference: data.reference as string,
    empanelmentReference: (practitioner?.reference as string) ?? "—",
    practitioner: (practitioner?.full_name as string | undefined) ?? "Practitioner",
    city: (practitioner?.city as string | undefined) ?? "",
    state: (practitioner?.state as string | undefined) ?? "",
    issuedOn: dateOnly(data.issued_on as string | null) ?? "—",
    signedName: data.signed_name as string | null,
    signedAt: data.signed_at ? formatRecordedAt(data.signed_at as string) : null,
    signatureMode:
      data.signature_mode === "drawn" ? "Drawn" : data.signature_mode === "typed" ? "Typed" : null,
    signedIp: data.signed_ip as string | null,
    version: data.version as string,
  };
}

/**
 * Renders the signed document once and stores it against the agreement.
 *
 * Never throws. A storage failure must not undo a signature that has already
 * been recorded — the practitioner has signed, and telling them otherwise would
 * be the worse outcome. It is logged at error level instead, because the row is
 * then back to re-rendering on download and somebody has to know that.
 *
 * `upsert: false`: an agreement is signed once, so a second write means either a
 * retry after a partial failure or something wrong. Failing loudly beats
 * silently replacing an archived contract.
 */
export async function archiveSignedAgreement(traceId: string, agreementId: string): Promise<void> {
  try {
    const agreement = await buildSignedAgreement(agreementId);
    if (!agreement?.signedAt) {
      log.error(traceId, "agreement archive skipped — no signature on the row", { agreementId });
      return;
    }

    const pdf = await renderSignedAgreement(agreement);
    const supabase = createAdminClient();
    const key = keyFor(agreementId);

    // A real Blob rather than a cast: the storage client branches on the body
    // type, and a mis-cast Uint8Array uploads as something no reader expects.
    const body = new Blob([pdf as BlobPart], { type: "application/pdf" });
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(key, body, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    // Only now: a path on the row is the claim that the object exists, so
    // writing it before the upload would point the download at nothing.
    const { error: pathError } = await supabase
      .from("practitioner_agreements")
      .update({ signed_pdf_path: key })
      .eq("id", agreementId);
    if (pathError) throw new Error(pathError.message);

    log.info(traceId, "agreement archived", { agreementId, bytes: pdf.byteLength });
  } catch (cause) {
    log.error(traceId, "agreement archive failed — download will re-render this one", {
      agreementId,
      cause: String(cause),
    });
  }
}

/** The archived bytes, or null when there is no archive to serve. */
export async function readArchivedAgreement(path: string): Promise<Uint8Array | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}
