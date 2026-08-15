import "server-only";

import { log } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextReference } from "@/services/references";
import { recordActivity } from "@/services/console";

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

/**
 * Thrown when the target row is soft-deleted or gone (audit H1). A token can
 * outlive its row — e.g. an admin cancels a session assignment after the email
 * went out — and the write must refuse rather than record a legally-binding
 * consent/signature/rating against a dead row. Distinct from AlreadyRecorded so
 * the route can answer "this link is no longer valid" instead of "already done".
 */
export class LinkNoLongerValidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkNoLongerValidError";
  }
}

/** One rating per assignment — the unique constraint is the guard, not a check. */
export async function recordRating(
  assignmentId: string,
  rating: number,
  comments: string | undefined,
  ip: string,
): Promise<Receipt> {
  const supabase = createAdminClient();

  // The assignment must still be live (audit H1): the loader checks this at
  // render, but the route writes straight from the verified token id and never
  // calls the loader, so a rating could land against a cancelled assignment.
  const { data: assignment } = await supabase
    .from("session_practitioners")
    .select("id")
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!assignment) {
    throw new LinkNoLongerValidError("This session is no longer available.");
  }

  const { data, error } = await supabase
    .from("session_ratings")
    .insert({
      session_practitioner_id: assignmentId,
      rating,
      comments: comments?.trim() || null,
      // Origin evidence (audit H5): the column exists as the audit trail; the
      // route already computes this for rate limiting, then used to discard it.
      submitted_ip: ip,
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

export async function recordConsent(assignmentId: string, ip: string): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    // consent_ip is origin evidence for a binding consent (audit H5).
    .update({ consent_given_at: new Date().toISOString(), consent_ip: ip })
    .eq("id", assignmentId)
    // Never write to a cancelled/removed assignment (audit H1).
    .is("deleted_at", null)
    // Consent is given once. A second submission must not silently overwrite
    // the first, which is the timestamp of record.
    .is("consent_given_at", null)
    .select("consent_given_at")
    .maybeSingle();

  if (error) throw new Error(`session_practitioners consent update failed: ${error.message}`);
  if (data) return { at: data.consent_given_at };

  // 0 rows updated: either consent already given, or the assignment is
  // soft-deleted/gone. Distinguish so a dead link isn't reported as "already
  // recorded" (audit L1).
  const { data: live } = await supabase
    .from("session_practitioners")
    .select("consent_given_at")
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (live) throw new AlreadyRecordedError("Consent for this session has already been recorded.");
  throw new LinkNoLongerValidError("This session is no longer available.");
}

export interface SignedAgreement {
  fullName: string;
  signature: string;
  signatureMode: "drawn" | "typed";
}

export async function signAgreement(
  agreementId: string,
  input: SignedAgreement,
  ip: string,
): Promise<Receipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .update({
      signed_at: new Date().toISOString(),
      signed_name: input.fullName,
      // `signed_designation` is deliberately not written. The v2 delivery
      // removed the field, so there is no practitioner-supplied value to store;
      // the column stays for the rows that already have one, and can be dropped
      // once nothing depends on reading those back.
      signature_data: input.signature,
      signature_mode: input.signatureMode,
      // Origin evidence for a legally-binding e-signature (audit H5).
      signed_ip: ip,
    })
    .eq("id", agreementId)
    // Never sign a withdrawn/removed agreement (audit H1).
    .is("deleted_at", null)
    // An agreement is signed once. Re-signing would replace the record of what
    // was agreed and when.
    .is("signed_at", null)
    .select("signed_at")
    .maybeSingle();

  if (error) throw new Error(`practitioner_agreements sign failed: ${error.message}`);
  if (data) return { at: data.signed_at };

  // 0 rows: already signed, or the agreement is soft-deleted/gone (audit L1).
  const { data: live } = await supabase
    .from("practitioner_agreements")
    .select("signed_at")
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();
  if (live) throw new AlreadyRecordedError("This agreement has already been signed.");
  throw new LinkNoLongerValidError("This onboarding link is no longer valid.");
}

/**
 * The automatic transition a signature triggers (audit G3, step 5): signing the
 * empanelment agreement empanels the practitioner. Runs after `signAgreement`
 * from the agreements route. Best-effort and idempotent — it only promotes a
 * practitioner who is not already Empanelled, and a failure here must not undo a
 * signature that succeeded.
 *
 * The status is the whole outcome. This used to hand the practitioner's contact
 * back so the route could send the welcome email on the spot; the welcome is now
 * an admin action in the console, so nothing downstream needs a return value —
 * the activity entry is how the empanelment is announced.
 */
export async function empanelBySignature(
  traceId: string,
  agreementId: string,
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from("practitioner_agreements")
    .select("practitioner_id")
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!agreement) return null;

  // The IQC-EMP number is issued here, not when the agreement went out: it
  // records an empanelment, and until this moment there was not one.
  //
  // Only when the row does not already carry one. Rows created before migration
  // 0019 were given a number at agreement time, and that number is the one
  // their agreement email quoted — minting a second would leave the practitioner
  // holding a reference the platform no longer knows them by.
  //
  // The read-then-allocate is safe despite looking like a race: the update below
  // only matches a row that is not yet Empanelled, so of two concurrent
  // submissions exactly one writes. The loser wastes a sequence value, which
  // costs a gap and nothing else.
  const { data: existing } = await supabase
    .from("practitioners")
    .select("reference")
    .eq("id", agreement.practitioner_id)
    .maybeSingle();

  const reference = (existing?.reference as string | null) ?? (await nextReference(supabase, "practitioner"));

  const { data: practitioner } = await supabase
    .from("practitioners")
    .update({ status: "Empanelled", reference })
    .eq("id", agreement.practitioner_id)
    .is("deleted_at", null)
    .neq("status", "Empanelled")
    // `id` tells us whether a row moved: no update means the practitioner was
    // already Empanelled (or gone), and a second activity entry for an
    // empanelment that did not happen is noise in the audit trail.
    // `application_id` is what keeps the applicant's own tracker honest.
    .select("id, application_id")
    .maybeSingle();
  // No row moved. Usually because they were empanelled already — a manual mark,
  // or a resubmitted form — so hand back the number they were given then rather
  // than null, or the receipt would show a blank to someone who has one.
  if (!practitioner) return (existing?.reference as string | null) ?? null;

  // Keep the application in step, exactly as `empanelPractitioner` does for the
  // manual path. Without it the practitioner is empanelled and the application
  // stays at "Agreement Sent" forever — and it is the APPLICATION that /status
  // reads, so the "Track your application" link in the acknowledgment email
  // tells someone who has already signed to go and sign. Migration 0009 states
  // the rule this was breaking: a read-time reconciliation is not a reason to
  // store the wrong value, because the next writer would trust it.
  if (practitioner.application_id) {
    const { error } = await supabase
      .from("practitioner_applications")
      .update({ status: "Empanelled" })
      .eq("id", practitioner.application_id);
    // Logged rather than thrown: the signature and the empanelment both stand,
    // and losing them over a stale tracker would be the worse trade.
    if (error) {
      log.error(traceId, "application status not advanced after signature", {
        applicationId: practitioner.application_id,
        message: error.message,
      });
    }
  }

  await recordActivity({
    action: "practitioner.empanelled",
    entityType: "practitioner",
    entityRef: agreement.practitioner_id as string,
    detail: "Automatic — empanelment agreement signed.",
  });

  // Handed back so the receipt can print it. The page cannot have loaded it —
  // it did not exist when the page was rendered.
  return reference;
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