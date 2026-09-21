import "server-only";

import { randomUUID } from "node:crypto";

import {
  EXTENSION,
  MAX_UPLOAD_BYTES,
  type DraftAttachment,
  canDeleteAttachment,
  sniffType,
} from "@/lib/email/attachment-rules";
import type { EmailAttachment } from "@/lib/email/send";
import { renderSignedAgreement } from "@/lib/pdf/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSignedAgreement, readArchivedAgreement } from "@/services/agreement-archive";

/**
 * The reusable files an admin can attach to an email (migration 0022).
 *
 * Bytes live in the private `email-attachments` bucket and are read here with
 * the service role. The practitioner's signed agreement is not stored in this
 * table: it is already archived per agreement, and is offered alongside the
 * library under the id `agreement:<uuid>`.
 */

const BUCKET = "email-attachments";
export const AGREEMENT_PREFIX = "agreement:";

interface LibraryRow {
  id: string;
  label: string;
  file_name: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_email: string | null;
  default_for_welcome: boolean;
}

const COLUMNS =
  "id, label, file_name, storage_path, content_type, size_bytes, uploaded_by_email, default_for_welcome";

const toDraftAttachment = (
  row: LibraryRow,
  actor: { role: string; email: string },
): DraftAttachment => ({
  id: row.id,
  label: row.label,
  mention: row.label,
  contentType: row.content_type,
  sizeBytes: row.size_bytes,
  kind: "library",
  isDefault: row.default_for_welcome,
  previewUrl: `/api/email-attachments/${row.id}`,
  canDelete: canDeleteAttachment(actor.role, row.uploaded_by_email, actor.email),
});

/** Every live saved file, oldest first, plus which ones the welcome auto-attaches. */
export async function listLibrary(actor: { role: string; email: string }) {
  const { data, error } = await createAdminClient()
    .from("email_attachments")
    .select(COLUMNS)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error(`email_attachments read failed: ${error.message}`);
  const rows = (data ?? []) as LibraryRow[];
  return {
    files: rows.map((row) => toDraftAttachment(row, actor)),
    welcomeDefaultIds: rows.filter((r) => r.default_for_welcome).map((r) => r.id),
  };
}

/** The practitioner's signed agreement, when one exists to attach. */
export async function signedAgreementFor(practitionerId: string): Promise<DraftAttachment | null> {
  const { data, error } = await createAdminClient()
    .from("practitioner_agreements")
    .select("id, reference")
    .eq("practitioner_id", practitionerId)
    .is("deleted_at", null)
    .not("signed_at", "is", null)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`practitioner_agreements read failed: ${error.message}`);
  if (!data) return null;
  return {
    id: `${AGREEMENT_PREFIX}${data.id}`,
    // The name the recipient sees on the attachment (see `agreementBytes`).
    label: `${data.reference}-empanelment-agreement.pdf`,
    mention: "agreement",
    contentType: "application/pdf",
    // Not known without rendering; the UI shows the type instead of a size.
    sizeBytes: 0,
    kind: "agreement",
    isDefault: false,
    previewUrl: `/api/agreements/${data.id}/pdf?inline=1`,
    canDelete: true,
  };
}

/** The archived agreement bytes, or a render for a row signed before archiving. */
async function agreementBytes(agreementId: string): Promise<{ name: string; bytes: Uint8Array }> {
  const { data, error } = await createAdminClient()
    .from("practitioner_agreements")
    .select("reference, signed_pdf_path")
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("the signed agreement could not be found");

  const name = `${data.reference}-empanelment-agreement.pdf`;
  const path = data.signed_pdf_path as string | null;
  if (path) {
    // A row that claims an archive storage will not return must fail the send:
    // re-rendering would attach a contract the practitioner never signed.
    const bytes = await readArchivedAgreement(path);
    if (!bytes) throw new Error("the signed agreement could not be retrieved from storage");
    return { name, bytes };
  }
  const agreement = await buildSignedAgreement(agreementId);
  if (!agreement) throw new Error("the signed agreement could not be found");
  return { name, bytes: await renderSignedAgreement(agreement) };
}

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

/**
 * The chosen files as Brevo attachments, bytes fetched now.
 *
 * Throws if any chosen file cannot be read. The send runs in a background task
 * where a failure is visible only in `email_log`, so a welcome that silently
 * dropped the agreement would look sent. Failing here keeps it in the dialog.
 */
export async function resolveAttachments(ids: readonly string[]): Promise<EmailAttachment[]> {
  const supabase = createAdminClient();
  const out: EmailAttachment[] = [];
  for (const id of ids) {
    if (id.startsWith(AGREEMENT_PREFIX)) {
      const { name, bytes } = await agreementBytes(id.slice(AGREEMENT_PREFIX.length));
      out.push({ name, content: toBase64(bytes) });
      continue;
    }
    const { data: row } = await supabase
      .from("email_attachments")
      .select("file_name, storage_path")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!row) throw new Error("an attached file was deleted — reopen the message and try again");
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(row.storage_path);
    if (error || !blob) throw new Error(`could not read ${row.file_name} from storage`);
    out.push({ name: row.file_name, content: toBase64(new Uint8Array(await blob.arrayBuffer())) });
  }
  return out;
}

/** One saved file's bytes and type, for the preview route. Null when gone. */
export async function readLibraryFile(
  id: string,
): Promise<{ bytes: Uint8Array; contentType: string; fileName: string } | null> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("email_attachments")
    .select("file_name, storage_path, content_type")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return null;
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (error || !blob) return null;
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    contentType: row.content_type,
    fileName: row.file_name,
  };
}

/** Saves an upload to the library. Throws a message fit to show the admin. */
export async function addLibraryFile(
  file: { name: string; bytes: Uint8Array },
  actorEmail: string,
): Promise<{ id: string }> {
  if (file.bytes.byteLength === 0) throw new Error("That file is empty.");
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("That file is over 2 MB.");
  const type = sniffType(file.bytes);
  if (!type) throw new Error("Only PDF, PNG or JPG files can be attached.");

  const fileName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `file.${EXTENSION[type]}`;
  const storagePath = `${randomUUID()}.${EXTENSION[type]}`;
  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, new Blob([file.bytes as BlobPart], { type }), { contentType: type });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error } = await supabase
    .from("email_attachments")
    .insert({
      label: fileName.replace(/\.[^.]+$/, ""),
      file_name: fileName,
      storage_path: storagePath,
      content_type: type,
      size_bytes: file.bytes.byteLength,
      uploaded_by_email: actorEmail,
    })
    .select("id")
    .single();
  if (error || !data) {
    // No row means nothing would ever reference the object.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Could not save the file: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.id as string };
}

/**
 * Soft delete: the row and object stay, the file leaves every future email.
 * Recoverable by clearing `deleted_at`.
 */
export async function softDeleteLibraryFile(
  id: string,
  actor: { role: string; email: string },
): Promise<void> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("email_attachments")
    .select("uploaded_by_email")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!row) return;
  if (!canDeleteAttachment(actor.role, row.uploaded_by_email as string | null, actor.email)) {
    throw new Error("You can only delete files you uploaded.");
  }
  const { error } = await supabase
    .from("email_attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not delete the file: ${error.message}`);
}
