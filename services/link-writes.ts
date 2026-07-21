import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The writes the five tokenised pages perform.
 *
 * Every one is keyed by the uuid its verified token carried, never by anything
 * the browser sent. And every one returns the server's own timestamp: the
 * pages previously built receipts from `new Date()` in the browser, so a user
 * with a skewed clock would be shown a time that disagreed with the row.
 */

export interface Receipt {
  at: string;
}

/**
 * Thrown when the work was already done — a double-click, a re-opened link, a
 * second tab. Distinct from a failure so the route can say so instead of
 * reporting a fault that did not happen.
 */
export class AlreadyRecordedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadyRecordedError";
  }
}

/** One rating per assignment — the unique constraint is the guard, not a check. */
export async function recordRating(
  assignmentId: string,
  rating: number,
  comments: string | undefined,
): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_ratings")
    .insert({
      session_practitioner_id: assignmentId,
      rating,
      comments: comments?.trim() || null,
    })
    .select("submitted_at")
    .single();

  // 23505 is a unique violation: one rating per assignment, enforced by the
  // constraint rather than by a check that could race.
  if (error?.code === "23505") {
    throw new AlreadyRecordedError("A rating for this session has already been submitted.");
  }
  if (error) throw new Error(`session_ratings insert failed: ${error.message}`);
  return { at: data.submitted_at };
}

export async function recordConsent(assignmentId: string): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .update({ consent_given_at: new Date().toISOString() })
    .eq("id", assignmentId)
    // Consent is given once. A second submission must not silently overwrite
    // the first, which is the timestamp of record.
    .is("consent_given_at", null)
    .select("consent_given_at")
    .maybeSingle();

  if (error) throw new Error(`session_practitioners consent update failed: ${error.message}`);
  if (!data) throw new AlreadyRecordedError("Consent for this session has already been recorded.");
  return { at: data.consent_given_at };
}

export interface SignedAgreement {
  fullName: string;
  designation: string;
  signature: string;
  signatureMode: "drawn" | "typed";
}

export async function signAgreement(
  agreementId: string,
  input: SignedAgreement,
): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .update({
      signed_at: new Date().toISOString(),
      signed_name: input.fullName,
      signed_designation: input.designation,
      signature_data: input.signature,
      signature_mode: input.signatureMode,
    })
    .eq("id", agreementId)
    // An agreement is signed once. Re-signing would replace the record of what
    // was agreed and when.
    .is("signed_at", null)
    .select("signed_at")
    .maybeSingle();

  if (error) throw new Error(`practitioner_agreements sign failed: ${error.message}`);
  if (!data) throw new AlreadyRecordedError("This agreement has already been signed.");
  return { at: data.signed_at };
}

/**
 * Marks an invite used. Account creation belongs to the auth provider; this is
 * the half that makes the link single-use, and it runs first so a failure
 * cannot leave a consumed invite with no account.
 */
export async function consumeInvite(inviteId: string): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("consumed_at", null)
    .select("consumed_at")
    .maybeSingle();

  if (error) throw new Error(`admin_invites consume failed: ${error.message}`);
  if (!data) throw new AlreadyRecordedError("This invite has already been used.");
  return { at: data.consumed_at };
}
