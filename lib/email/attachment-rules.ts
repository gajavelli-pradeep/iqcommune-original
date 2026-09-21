/**
 * Pure rules for email attachments — shared by the service, the server
 * actions and the draft dialog, and free of `server-only` so unit tests and
 * the browser can import it.
 */

export type AttachmentType = "application/pdf" | "image/png" | "image/jpeg";

/** Per uploaded file. Brevo's ~4 MB cap is on the whole message, so one file
 *  may not take all of it; `attachmentsTooLarge` guards the total at send. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const EXTENSION: Record<AttachmentType, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

/**
 * The type from the file's own first bytes. The browser-declared type and the
 * extension are both chosen by the uploader, so neither is trusted.
 */
export function sniffType(bytes: Uint8Array): AttachmentType | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  return null;
}

/**
 * Who may delete a saved file: a global admin any of them, anyone else only
 * what they uploaded. Seeded files have no uploader, so only a global admin
 * can remove those. `user` holds no `mutate` capability and is refused before
 * this is asked.
 */
export function canDeleteAttachment(
  role: string,
  uploadedBy: string | null,
  actorEmail: string,
): boolean {
  if (role === "global_admin") return true;
  return Boolean(uploadedBy) && uploadedBy?.toLowerCase() === actorEmail.toLowerCase();
}

export interface MentionableFile {
  id: string;
  /** Text a body would use to refer to this file, e.g. "Session Standee". */
  mention: string;
  label: string;
}

/**
 * Files the text talks about that are not attached — the welcome email says
 * "attached: …", the admin removes one, and the recipient would look for a
 * file that is not there. Case-insensitive; `&` and "and" are treated alike.
 */
export function unattachedMentions(
  body: string,
  files: MentionableFile[],
  attachedIds: readonly string[],
): MentionableFile[] {
  const norm = (s: string) => s.toLowerCase().replaceAll("&", "and").replace(/\s+/g, " ");
  const text = norm(body);
  return files.filter((f) => !attachedIds.includes(f.id) && text.includes(norm(f.mention)));
}

/** One file the dialog can attach. */
export interface DraftAttachment {
  /** A library row id, or `agreement:<uuid>` for the practitioner's contract. */
  id: string;
  label: string;
  /** What an email body would call it, to warn when it names a removed file. */
  mention: string;
  contentType: string;
  /** 0 when unknown (the agreement is not measured until it is sent). */
  sizeBytes: number;
  /** `agreement` is removed from this email only; `library` files are saved and
   *  deleting one removes it from every future email. */
  kind: "agreement" | "library";
  /** Saved file the welcome email attaches by default (the V8 flyers). */
  isDefault: boolean;
  previewUrl: string;
  /** Whether the signed-in admin may delete it (library files only). */
  canDelete: boolean;
}
