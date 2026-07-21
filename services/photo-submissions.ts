import { createAdminClient } from "@/lib/supabase/admin";
import type { PhotoSubmissionInput } from "@/lib/schemas/photo-submission";

/** Writes a post-session photo submission and its uploaded objects. */

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET || "session-photos";

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

  for (const [index, photo] of photos.entries()) {
    const extension = photo.type === "image/png" ? "png" : "jpg";
    const key = `${submissionId}/${index + 1}.${extension}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, photo, { contentType: photo.type, upsert: false });
    if (error) throw new Error(`photo upload failed: ${error.message}`);
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
    // The row is the record; orphaned objects without it are unreferenced
    // storage, so clean them up rather than leaving them to a cron.
    await supabase.storage.from(BUCKET).remove(storageKeys);
    throw new Error(`photo_submissions insert failed: ${error.message}`);
  }

  return {
    id: data.id,
    photoCount: storageKeys.length,
    submittedAt: data.created_at,
    expiryDate: data.expiry_date,
  };
}
