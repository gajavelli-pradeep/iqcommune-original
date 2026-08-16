import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PhotoSubmissionInput } from "@/lib/schemas/photo-submission";

/** Writes a post-session photo submission and its uploaded objects. */

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET || "session-photos";

// Magic-byte signatures (audit M1). `file.type` in multipart data is
// client-declared, so allow-listing on it lets an attacker store arbitrary bytes
// (an HTML/SVG polyglot) labelled image/png. Sniff the real leading bytes and
// derive the stored extension + contentType from that, never from the browser.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

export async function sniffImageType(file: File): Promise<"image/png" | "image/jpeg" | null> {
  const header = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer());
  if (PNG_SIGNATURE.every((byte, i) => header[i] === byte)) return "image/png";
  if (JPEG_SIGNATURE.every((byte, i) => header[i] === byte)) return "image/jpeg";
  return null;
}

/**
 * A failure this route can describe, rather than one it can only apologise for.
 *
 * Everything past validation used to collapse into "Something went wrong
 * sending your photos" — a file that was not really a JPEG, a storage upload
 * that was refused and a row that would not insert all read identically, and
 * the only thing separating them was a server log the person uploading cannot
 * see. `reason` is what lets the route say which happened, and decide whether
 * it is the sender's to fix.
 */
export class PhotoSubmissionError extends Error {
  constructor(
    readonly reason: "content" | "storage" | "record",
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PhotoSubmissionError";
  }
}

export interface CreatedPhotoSubmission {
  id: string;
  photoCount: number;
  /** From the row, not the browser — the receipt must match what was stored. */
  submittedAt: string;
  expiryDate: string;
}

/** Set when the submission came from a tokenised link rather than the public modal. */
export interface PhotoSubmissionOwner {
  sessionId: string;
  practitionerId: string;
}

export async function createPhotoSubmission(
  input: PhotoSubmissionInput,
  photos: File[],
  owner?: PhotoSubmissionOwner,
): Promise<CreatedPhotoSubmission> {
  const supabase = createAdminClient();
  const submissionId = crypto.randomUUID();
  const storageKeys: string[] = [];

  // One try around the whole upload+insert (audit M2): any failure — rejected
  // content, a failed upload partway through, or a failed row insert — must
  // leave no orphaned objects. The previous cleanup covered only the insert
  // path, so a failure at upload N stranded objects 1..N-1 forever (nothing
  // references them, so row-based retention never expires them).
  try {
    for (const [index, photo] of photos.entries()) {
      const sniffed = await sniffImageType(photo);
      if (!sniffed) {
        // The browser's `type` said image; the bytes disagree. Named, because
        // this is the one failure here the sender can act on — most often a
        // HEIC or WebP carrying a .jpg name.
        throw new PhotoSubmissionError(
          "content",
          `"${photo.name}" is not a JPEG or PNG inside, whatever its name says. Re-save or re-export it and try again.`,
        );
      }
      const extension = sniffed === "image/png" ? "png" : "jpg";
      const key = `${submissionId}/${index + 1}.${extension}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(key, photo, { contentType: sniffed, upsert: false });
      if (error) {
        throw new PhotoSubmissionError("storage", "The photos could not be stored.", error);
      }
      storageKeys.push(key);
    }

    const { data, error } = await supabase
      .from("photo_submissions")
      .insert({
        id: submissionId,
        submitter_name: input.submitterName,
        submitter_email: input.submitterEmail,
        organisation_name: input.organisationName || null,
        session_date: input.sessionDate,
        module_taught: input.moduleTaught,
        storage_keys: storageKeys,
        participant_consent: input.participantConsent,
        // Never from the body: the token decides which session these belong to.
        session_id: owner?.sessionId ?? null,
        practitioner_id: owner?.practitionerId ?? null,
      })
      .select("id, created_at, expiry_date")
      .single();

    if (error) {
      throw new PhotoSubmissionError(
        "record",
        "The photos uploaded, but the submission could not be recorded.",
        error,
      );
    }

    return {
      id: data.id,
      photoCount: storageKeys.length,
      submittedAt: data.created_at,
      expiryDate: data.expiry_date,
    };
  } catch (cause) {
    if (storageKeys.length > 0) {
      await supabase.storage.from(BUCKET).remove(storageKeys);
    }
    throw cause;
  }
}