"use server";

import { revalidatePath } from "next/cache";

import { dispatchEmail } from "@/lib/email/dispatch";
import { sendEmail } from "@/lib/email/send";
import {
  adminInvite,
  applicationRejected,
  consentRequest,
  onboardingLink,
  photoReminder,
  practitionerDeactivated,
  practitionerWelcome,
  ratingRequest,
  sessionRequestCancelled,
  sessionRequestFollowUp,
} from "@/lib/email/templates";
import { newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { GALLERY_LIMIT } from "@/constants/gallery";
import { recordActivity } from "@/services/console";

import { requireCapability } from "./requireRole";
import { toConsoleRole } from "./roles";

/**
 * Console mutations (audit C6). Every one:
 *   1. re-checks the capability server-side (`requireCapability`) — the client
 *      controls are gated for UX, not trust;
 *   2. performs the status transition (audit G3 — the automatic steps the V7
 *      procedure defines);
 *   3. fires any email off the response path via `dispatchEmail`;
 *   4. appends an audit-trail entry (audit M9); and
 *   5. revalidates the console so the change shows without a manual refresh.
 *
 * The 15-second Undo window (procedure §114) is client-side (`useDeferredSend`):
 * the action is only invoked once that window elapses, so an internal email
 * (welcome/rejection/deactivation) sending "immediately" here is still 15s after
 * the click — the hold the procedure asks for (audit G4c).
 */

/**
 * The outcome of an action that can legitimately refuse.
 *
 * A thrown server action reaches the browser as a 500. That is right for a
 * fault and wrong for "you haven't filled this in yet" — the second is a normal
 * step in the flow, and logging it as a server error buries the real ones.
 * Actions that only ever succeed or fault keep returning `void` and throwing.
 */
export type ActionResult = { ok: true } | { ok: false; message: string };

function revalidateConsole() {
  revalidatePath("/console");
  revalidatePath("/globaladmin");
  revalidatePath("/user");
}

/** A practitioner's contact details, by whichever id references them. */
async function practitionerContact(
  supabase: ReturnType<typeof createAdminClient>,
  practitionerId: string,
): Promise<{ email: string; firstName: string } | null> {
  const { data } = await supabase
    .from("practitioners")
    .select("email, full_name")
    .eq("id", practitionerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  return { email: data.email, firstName: (data.full_name as string).split(" ")[0] };
}

// ── Session requests ─────────────────────────────────────────────────────────

/**
 * The terms agreed with a practitioner on the phone, recorded against the
 * request while it is still New. V7 captures these before anything is matched,
 * which is why they live on the request rather than on a session that does not
 * exist yet.
 */
export async function updateSessionRequestTerms(
  id: string,
  terms: { assignedPractitionerId?: string | null; agreedPayout?: number | null },
): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {};
  const changed: string[] = [];
  if ("assignedPractitionerId" in terms) {
    patch.assigned_practitioner_id = terms.assignedPractitionerId || null;
    changed.push(terms.assignedPractitionerId ? "practitioner assigned" : "practitioner cleared");
  }
  if ("agreedPayout" in terms) {
    const payout = terms.agreedPayout;
    if (payout !== null && payout !== undefined && (!Number.isFinite(payout) || payout < 0)) {
      throw new Error("the agreed payout must be a positive amount");
    }
    patch.agreed_gross_payout = payout ?? null;
    changed.push(payout === null || payout === undefined ? "payout cleared" : `payout set to ${payout}`);
  }
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("session_requests")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`saving the agreed terms failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "request.terms_updated",
    entityType: "request",
    entityRef: id,
    detail: changed.join(", "),
  });
  revalidateConsole();
}

/**
 * Matching a request — the step that turns an enquiry into real work
 * (procedure step 8).
 *
 * It is not a status flip. Marking a request Matched creates the session it
 * becomes and the assignment that carries the agreed payout, so the Session
 * Details, Consent and Payouts tabs fill themselves. Without that the
 * downstream tabs would need someone to key the same facts in again, which is
 * exactly the manual synchronisation the V7 procedure exists to remove.
 *
 * It therefore refuses to run until the terms are recorded: a session with no
 * practitioner and no payout is not a match, it is a half-finished one.
 *
 * Idempotent — re-matching an already-matched request does not create a second
 * session.
 */
export async function matchSessionRequest(id: string): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data: request, error: readError } = await supabase
    .from("session_requests")
    .select(
      "id, status, topic, audience, city, state, group_size, first_name, last_name, assigned_practitioner_id, agreed_gross_payout, venue_details",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) throw new Error(`request read failed: ${readError.message}`);
  if (!request) throw new Error("that request no longer exists");

  // Returned, not thrown: this is the operator being told what is still needed,
  // which is a normal outcome of the flow. Throwing would transport it as a
  // 500, putting a routine "fill this in first" in the error log next to real
  // faults.
  if (!request.assigned_practitioner_id) {
    return { ok: false, message: "Choose the practitioner who agreed before matching this request." };
  }
  if (request.agreed_gross_payout === null) {
    return { ok: false, message: "Record the agreed gross payout before matching this request." };
  }

  const { data: existing } = await supabase
    .from("sessions")
    .select("id, reference")
    .eq("session_request_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  let sessionId: string;
  let sessionReference: string;

  if (existing) {
    sessionId = existing.id as string;
    sessionReference = existing.reference as string;
  } else {
    sessionReference = await nextReference(supabase, "session");
    const { data: created, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        status: "Pending",
        reference: sessionReference,
        session_request_id: id,
        module: request.topic,
        audience: request.audience,
        city: request.city,
        state: request.state,
        venue: request.venue_details,
        participants: request.group_size,
        spoc_name: `${request.first_name} ${request.last_name}`,
        // The date is agreed on the call that follows the match; the client's
        // preferred window is what they asked for, not a commitment, so it is
        // not written in as one (migration 0011 makes the column nullable).
        session_date: null,
      })
      .select("id")
      .single();
    if (sessionError) throw new Error(`session create failed: ${sessionError.message}`);
    sessionId = created.id as string;
  }

  // The assignment carries the payout the whole finance side reads from.
  const { data: assignment } = await supabase
    .from("session_practitioners")
    .select("id")
    .eq("session_id", sessionId)
    .eq("practitioner_id", request.assigned_practitioner_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!assignment) {
    const { error: assignError } = await supabase.from("session_practitioners").insert({
      session_id: sessionId,
      practitioner_id: request.assigned_practitioner_id,
      gross_payout: request.agreed_gross_payout,
      confirmation_reference: await nextReference(supabase, "confirmation"),
    });
    if (assignError) throw new Error(`assignment create failed: ${assignError.message}`);
  }

  const { error } = await supabase
    .from("session_requests")
    .update({ status: "Matched" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`match failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "request.matched",
    entityType: "request",
    entityRef: id,
    detail: `Created session ${sessionReference} and its assignment.`,
  });
  revalidateConsole();
  return { ok: true };
}

/**
 * "Send follow-up to client" — chases a request that is waiting on the
 * requester. What is outstanding is derived from the record rather than left to
 * the admin to remember, so the email says which thing is missing.
 */
export async function sendRequestFollowUp(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("session_requests")
    .select("first_name, email, venue_details, preferred_window, min_commitment, group_size")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`request read failed: ${error.message}`);
  if (!data) throw new Error("that request no longer exists");

  const outstanding: string[] = [];
  if (!data.venue_details) outstanding.push("The venue - where the session will be held.");
  if (!data.preferred_window) outstanding.push("Your preferred dates.");
  if (!data.min_commitment) outstanding.push("The minimum number of participants you can commit to.");
  if (!data.group_size) outstanding.push("The expected group size.");
  if (outstanding.length === 0) {
    outstanding.push("Confirmation that you're still happy to go ahead, so we can lock a date.");
  }

  dispatchEmail(
    newTraceId(),
    sessionRequestFollowUp(data.email as string, data.first_name as string, outstanding),
  );
  await recordActivity({
    actorEmail: actor,
    action: "request.followed_up",
    entityType: "request",
    entityRef: id,
    detail: outstanding.join(" "),
  });
}

/** "Send cancellation message" — tells the client, without changing the status. */
export async function sendRequestCancellation(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("session_requests")
    .select("first_name, email")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("that request no longer exists");

  dispatchEmail(newTraceId(), sessionRequestCancelled(data.email as string, data.first_name as string));
  await recordActivity({
    actorEmail: actor,
    action: "request.cancellation_sent",
    entityType: "request",
    entityRef: id,
  });
}

/** The request panel's status select — the three V7 offers. */
const REQUEST_STAGES = new Set(["New", "Matched", "Cancelled"]);

export async function setSessionRequestStatus(id: string, status: string): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  if (!REQUEST_STAGES.has(status)) throw new Error(`unknown request status: ${status}`);

  // Matching does real work, so it is not a plain update; routing it through
  // here keeps the select on the same path as everything else rather than two
  // that can diverge.
  if (status === "Matched") return matchSessionRequest(id);
  if (status === "Cancelled") {
    await cancelSessionRequest(id);
    return { ok: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("session_requests")
    .update({ status: "New" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`status update failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "request.reopened",
    entityType: "request",
    entityRef: id,
  });
  revalidateConsole();
  return { ok: true };
}

/** The request card's danger zone — only while nothing downstream exists. */
export async function deleteSessionRequest(id: string): Promise<void> {
  const { email: actor } = await requireCapability("purge");
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("session_request_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (session) {
    throw new Error("this request already became a session — cancel it instead");
  }

  const { error } = await supabase
    .from("session_requests")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`delete failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "request.deleted",
    entityType: "request",
    entityRef: id,
  });
  revalidateConsole();
}

export async function cancelSessionRequest(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("session_requests")
    .update({ status: "Cancelled" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`cancel failed: ${error.message}`);
  await recordActivity({ actorEmail: actor, action: "request.cancelled", entityType: "request", entityRef: id });
  revalidateConsole();
}

// ── Practitioners ──────────────────────────────────────────────────────────
//
// The pipeline spans two tables (see `listPractitioners`), so these take the
// namespaced row id and act on whichever record the stage belongs to. The two
// judgement-call stages — Applied and Screening Done — live on the application;
// everything from "Generate & send agreement" onwards involves a practitioner.

/** Unwraps a `PractitionerRow.id`. Throws rather than guessing on a bad shape. */
function pipelineId(rowId: string): { table: "application" | "practitioner"; id: string } {
  const [kind, id] = rowId.split(":");
  if (kind === "app" && id) return { table: "application", id };
  if (kind === "prac" && id) return { table: "practitioner", id };
  throw new Error(`unrecognised pipeline id: ${rowId}`);
}

/** The V7 stages an admin sets by hand — the screening call happens offline. */
const MANUAL_STAGES = new Set(["Applied", "Screening Done", "Rejected"]);

/**
 * The judgement-call stage select in the detail card. Deliberately refuses the
 * automatic stages: 'Agreement Sent' and 'Empanelled' are set by the system
 * when the link goes out and when the signature comes back, and letting the
 * select write them would put the pipeline out of step with the agreement.
 */
export async function setApplicationStage(rowId: string, stage: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  if (!MANUAL_STAGES.has(stage)) throw new Error(`stage is not set by hand: ${stage}`);

  const { table, id } = pipelineId(rowId);
  if (table !== "application") throw new Error("this practitioner is past the screening stages");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("practitioner_applications")
    .update({ status: stage })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`stage update failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "application.stage_set",
    entityType: "application",
    entityRef: id,
    detail: `Set stage to ${stage}.`,
  });
  revalidateConsole();
}

/**
 * "Generate & send empanelment agreement" — the pipeline's promotion point.
 *
 * Creates the practitioner and the agreement the onboarding link resolves to,
 * then moves the application to 'Agreement Sent'. The practitioner is created
 * as 'Pending', not 'Empanelled': they are empanelled when the signature comes
 * back (`empanelBySignature`), not when the email goes out.
 *
 * Idempotent — a second click resends the link for the existing agreement
 * rather than issuing a second one.
 */
export async function generateAndSendAgreement(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { table, id } = pipelineId(rowId);

  let practitionerId: string;
  let applicationId: string | null = null;

  if (table === "practitioner") {
    practitionerId = id;
  } else {
    applicationId = id;
    const { data: application, error: readError } = await supabase
      .from("practitioner_applications")
      .select("id, first_name, last_name, email, job_title, city, modules")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) throw new Error(`application read failed: ${readError.message}`);
    if (!application) throw new Error("that application no longer exists");

    // An application already promoted (the click that timed out, the double
    // submit) must not produce a second practitioner.
    const { data: existing } = await supabase
      .from("practitioners")
      .select("id")
      .eq("application_id", application.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      practitionerId = existing.id as string;
    } else {
      const reference = await nextReference(supabase, "practitioner");
      const { data: created, error: createError } = await supabase
        .from("practitioners")
        .insert({
          status: "Pending",
          reference,
          full_name: `${application.first_name} ${application.last_name}`,
          role: application.job_title,
          city: application.city,
          email: application.email,
          application_id: application.id,
        })
        .select("id")
        .single();
      if (createError) throw new Error(`practitioner create failed: ${createError.message}`);
      practitionerId = created.id as string;
    }
  }

  // One live agreement per practitioner at a time — resend reuses it, so the
  // link in an old email keeps working.
  const { data: openAgreement } = await supabase
    .from("practitioner_agreements")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .is("signed_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  let agreementId: string;
  if (openAgreement) {
    agreementId = openAgreement.id as string;
  } else {
    const { data: application } = applicationId
      ? await supabase
          .from("practitioner_applications")
          .select("modules")
          .eq("id", applicationId)
          .maybeSingle()
      : { data: null };

    const reference = await nextReference(supabase, "agreement");
    const { data: created, error: agreementError } = await supabase
      .from("practitioner_agreements")
      .insert({
        practitioner_id: practitionerId,
        reference,
        modules: application?.modules ?? [],
      })
      .select("id")
      .single();
    if (agreementError) throw new Error(`agreement create failed: ${agreementError.message}`);
    agreementId = created.id as string;
  }

  if (applicationId) {
    await supabase
      .from("practitioner_applications")
      .update({ status: "Agreement Sent" })
      .eq("id", applicationId);
  }

  const contact = await practitionerContact(supabase, practitionerId);
  if (contact) dispatchEmail(newTraceId(), onboardingLink(contact.email, contact.firstName, agreementId));

  await recordActivity({
    actorEmail: actor,
    action: "agreement.sent",
    entityType: "agreement",
    entityRef: agreementId,
    detail: openAgreement ? "Resent the existing agreement link." : "Generated and sent the empanelment agreement.",
  });
  revalidateConsole();
}

/** Asks Postgres for the next reference (migration 0008) — see the sequence note there. */
async function nextReference(
  supabase: ReturnType<typeof createAdminClient>,
  kind: "practitioner" | "agreement" | "session" | "confirmation",
): Promise<string> {
  const { data, error } = await supabase.rpc("next_reference", { kind });
  if (error || !data) throw new Error(`could not allocate a ${kind} reference: ${error?.message ?? "no value"}`);
  return data as string;
}

/** "Send rejection message" — sets the stage and tells the applicant. */
export async function rejectApplication(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const { table, id } = pipelineId(rowId);
  if (table !== "application") throw new Error("only an application can be rejected");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_applications")
    .update({ status: "Rejected" })
    .eq("id", id)
    .is("deleted_at", null)
    .select("email, first_name")
    .maybeSingle();
  if (error) throw new Error(`rejection failed: ${error.message}`);

  if (data) dispatchEmail(newTraceId(), applicationRejected(data.email as string, data.first_name as string));
  await recordActivity({
    actorEmail: actor,
    action: "application.rejected",
    entityType: "application",
    entityRef: id,
  });
  revalidateConsole();
}

/**
 * "Signed copy received some other way? → Mark Empanelled manually." The escape
 * hatch for a practitioner who signed on paper, so the pipeline is not stuck
 * waiting for a webhook that will never arrive.
 */
export async function empanelPractitioner(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const { table, id } = pipelineId(rowId);
  if (table !== "practitioner") {
    throw new Error("send the agreement first — there is no practitioner record to empanel yet");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioners")
    .update({ status: "Empanelled" })
    .eq("id", id)
    .is("deleted_at", null)
    .select("application_id")
    .maybeSingle();
  if (error) throw new Error(`empanel failed: ${error.message}`);

  // Keep the application in step, or the union read would show the stage it
  // stopped at forever.
  if (data?.application_id) {
    await supabase
      .from("practitioner_applications")
      .update({ status: "Empanelled" })
      .eq("id", data.application_id);
  }

  const contact = await practitionerContact(supabase, id);
  if (contact) dispatchEmail(newTraceId(), practitionerWelcome(contact.email, contact.firstName));
  await recordActivity({
    actorEmail: actor,
    action: "practitioner.empanelled",
    entityType: "practitioner",
    entityRef: id,
    detail: "Marked manually — signed copy received outside the online flow.",
  });
  revalidateConsole();
}

/** "Send welcome message" — the welcome email on its own, no status change. */
export async function sendWelcomeMessage(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const { table, id } = pipelineId(rowId);
  if (table !== "practitioner") throw new Error("this applicant is not empanelled yet");

  const supabase = createAdminClient();
  const contact = await practitionerContact(supabase, id);
  if (contact) dispatchEmail(newTraceId(), practitionerWelcome(contact.email, contact.firstName));
  await recordActivity({
    actorEmail: actor,
    action: "practitioner.welcomed",
    entityType: "practitioner",
    entityRef: id,
  });
}

export async function deactivatePractitioner(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const { table, id } = pipelineId(rowId);
  if (table !== "practitioner") throw new Error("only an empanelled practitioner can be deactivated");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("practitioners")
    .update({ status: "Deactivated" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`deactivate failed: ${error.message}`);

  const contact = await practitionerContact(supabase, id);
  if (contact) dispatchEmail(newTraceId(), practitionerDeactivated(contact.email, contact.firstName));
  await recordActivity({
    actorEmail: actor,
    action: "practitioner.deactivated",
    entityType: "practitioner",
    entityRef: id,
  });
  revalidateConsole();
}

/** "Reactivate" — the deactivation is a pause, not a deletion, so it reverses. */
export async function reactivatePractitioner(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const { table, id } = pipelineId(rowId);
  if (table !== "practitioner") throw new Error("only a practitioner can be reactivated");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("practitioners")
    .update({ status: "Empanelled" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`reactivate failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "practitioner.reactivated",
    entityType: "practitioner",
    entityRef: id,
  });
  revalidateConsole();
}

/**
 * The detail card's danger zone. Only an application with no downstream history
 * can go — once an agreement or a session exists, "Deactivated" is the answer,
 * exactly as the V7 card says. Soft delete, so the audit trail survives.
 */
export async function deleteApplication(rowId: string): Promise<void> {
  const { email: actor } = await requireCapability("purge");
  const { table, id } = pipelineId(rowId);
  if (table !== "application") {
    throw new Error("this practitioner has agreement or session history — deactivate instead");
  }

  const supabase = createAdminClient();
  const { data: promoted } = await supabase
    .from("practitioners")
    .select("id")
    .eq("application_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (promoted) {
    throw new Error("this practitioner has agreement or session history — deactivate instead");
  }

  const { error } = await supabase
    .from("practitioner_applications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`delete failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "application.deleted",
    entityType: "application",
    entityRef: id,
  });
  revalidateConsole();
}

/**
 * The detail card's "Notes" — internal admin context on an applicant, stored on
 * the application (migration 0008). Any role that can progress a record can
 * annotate it; this is a working note, not an override of a recorded value.
 */
export async function savePractitionerNotes(rowId: string, notes: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const applicationId = await applicationIdFor(supabase, rowId);

  const { error } = await supabase
    .from("practitioner_applications")
    .update({ admin_notes: notes.trim() || null })
    .eq("id", applicationId)
    .is("deleted_at", null);
  if (error) throw new Error(`saving notes failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "practitioner.note_saved",
    entityType: "application",
    entityRef: applicationId,
  });
  revalidateConsole();
}

/** Resolves either half of the union to the application that holds the profile. */
async function applicationIdFor(
  supabase: ReturnType<typeof createAdminClient>,
  rowId: string,
): Promise<string> {
  const { table, id } = pipelineId(rowId);
  if (table === "application") return id;

  const { data } = await supabase
    .from("practitioners")
    .select("application_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  const applicationId = (data?.application_id as string | null) ?? null;
  // A practitioner seeded directly, with no application behind them, has
  // nowhere to put this. Saying so beats writing it into the void.
  if (!applicationId) throw new Error("this practitioner has no application record");
  return applicationId;
}

/** The fields a Global Admin may correct by hand (V7 `.override-btn`). */
const OVERRIDABLE = {
  module: { table: "practitioner_applications", column: "modules", isArray: true },
  city: { table: "practitioner_applications", column: "city", isArray: false },
  state: { table: "practitioner_applications", column: "state", isArray: false },
  address: { table: "practitioner_applications", column: "address", isArray: false },
  tshirt: { table: "practitioner_applications", column: "tshirt_size", isArray: false },
  experience: { table: "practitioner_applications", column: "experience_band", isArray: false },
  email: { table: "practitioner_applications", column: "email", isArray: false },
  phone: { table: "practitioner_applications", column: "phone", isArray: false },
} as const;

export type OverridableField = keyof typeof OVERRIDABLE;

/**
 * A Global-Admin correction to a field the applicant supplied (V7's pencil
 * buttons). Global Admin only — `override` is deliberately not part of
 * `mutate`, because correcting a system-of-record value is a different power
 * from progressing a record through its pipeline.
 *
 * Writes to the application, which is where these fields live. The two columns
 * the practitioner record duplicates (email, city) are kept in step so the
 * table and the card cannot disagree.
 */
export async function overridePractitionerField(
  rowId: string,
  field: OverridableField,
  value: string,
): Promise<void> {
  const { email: actor } = await requireCapability("override");
  const spec = OVERRIDABLE[field];
  if (!spec) throw new Error(`field is not overridable: ${field}`);

  const trimmed = value.trim();
  if (!trimmed) throw new Error("a corrected value cannot be empty");

  const supabase = createAdminClient();
  const { table, id } = pipelineId(rowId);
  const applicationId = await applicationIdFor(supabase, rowId);

  const { error } = await supabase
    .from(spec.table)
    .update({ [spec.column]: spec.isArray ? trimmed.split(",").map((part) => part.trim()) : trimmed })
    .eq("id", applicationId)
    .is("deleted_at", null);
  if (error) throw new Error(`override failed: ${error.message}`);

  // The practitioner record carries its own copy of these two.
  if (table === "practitioner" && (field === "email" || field === "city")) {
    await supabase.from("practitioners").update({ [field]: trimmed }).eq("id", id);
  }

  await recordActivity({
    actorEmail: actor,
    action: "practitioner.field_overridden",
    entityType: "application",
    entityRef: applicationId,
    detail: `Global Admin corrected ${field}.`,
  });
  revalidateConsole();
}

// ── Sessions ────────────────────────────────────────────────────────────────

/**
 * Every state a session may legally be set to by hand.
 *
 * Two panels drive this and they offer different subsets, exactly as V7 does:
 * Session Details offers Confirmed/Completed (it is the delivery view, and
 * marking delivery is its job), while the Session Consent tab's Part 2 offers
 * Pending/Confirmed/Cancelled (it is the issuing view, and cancelling is what
 * happens there when a session falls through). The union is validated here so
 * neither panel is the guard.
 */
const SESSION_STAGES = new Set(["Pending", "Confirmed", "Completed", "Cancelled"]);

const SESSION_STAGE_ACTIONS: Record<string, string> = {
  Pending: "session.reopened",
  Confirmed: "session.confirmed",
  Completed: "session.completed",
  Cancelled: "session.cancelled",
};

/**
 * Marking a session Completed is what opens the rating and the payout — the
 * rating link is only sendable afterwards, and Payouts reads delivered work.
 * Cancelling it tells the client, because a session that quietly disappears
 * from the console has not been cancelled from their side.
 */
export async function setSessionStatus(sessionId: string, status: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  if (!SESSION_STAGES.has(status)) throw new Error(`unknown session status: ${status}`);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", sessionId)
    .is("deleted_at", null)
    .select("reference, session_request_id")
    .maybeSingle();
  if (error) throw new Error(`session status update failed: ${error.message}`);

  if (status === "Cancelled" && data?.session_request_id) {
    const { data: request } = await supabase
      .from("session_requests")
      .select("first_name, email")
      .eq("id", data.session_request_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (request) {
      dispatchEmail(
        newTraceId(),
        sessionRequestCancelled(request.email as string, request.first_name as string),
      );
    }
  }

  await recordActivity({
    actorEmail: actor,
    action: SESSION_STAGE_ACTIONS[status] ?? "session.status_set",
    entityType: "session",
    entityRef: sessionId,
    detail: data?.reference ? `${data.reference} → ${status}.` : undefined,
  });
  revalidateConsole();
}

/**
 * "Got it verbally? — Record manually." A Global Admin keying in a rating the
 * requestor gave on the phone.
 *
 * Global Admin only, and stamped with who recorded it: a rating entered by an
 * admin is not the same evidence as one the requestor submitted through their
 * own link, and a practitioner's average is built from these. Storing them
 * identically would quietly launder the difference away.
 */
export async function recordRatingManually(
  assignmentId: string,
  rating: number,
): Promise<ActionResult> {
  const { email: actor } = await requireCapability("override");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "A rating must be a whole number from 1 to 5." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("session_ratings")
    .upsert(
      { session_practitioner_id: assignmentId, rating, recorded_by: actor ?? "admin" },
      { onConflict: "session_practitioner_id" },
    );
  if (error) throw new Error(`recording the rating failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "rating.recorded_manually",
    entityType: "assignment",
    entityRef: assignmentId,
    detail: `${rating}/5, from a verbal report.`,
  });
  revalidateConsole();
  return { ok: true };
}

// ── Team & access (V7 tab 9) ────────────────────────────────────────────────

/** How long an invite link stays usable. */
const INVITE_TTL_HOURS = 72;

/** The role as a person says it, for the audit line. */
const ROLE_WORD: Record<string, string> = {
  global_admin: "Global Admin",
  admin: "Admin",
  user: "User",
};

/**
 * Invites someone into the console.
 *
 * `manageTeam`, not `mutate`: handing out console access is a different power
 * from progressing records, and V7 marks the whole invite box `role-team` for
 * the same reason. A Global Admin is the only role that can widen the set of
 * people who can see this data.
 *
 * The invite is a row plus a signed link. The row is what makes it single-use —
 * a token cannot be revoked before it expires (ADR 0004), so consumption has to
 * be recorded somewhere the loader checks.
 */
export async function inviteTeamMember(email: string, role: string): Promise<ActionResult> {
  const { email: actor } = await requireCapability("manageTeam");

  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const consoleRole = toConsoleRole(role);
  if (!consoleRole) return { ok: false, message: `Unknown role: ${role}.` };

  const supabase = createAdminClient();

  // An address that already has an account does not need an invite, and
  // sending one would imply it worked.
  const { data: accounts } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (accounts?.users.some((user) => user.email?.toLowerCase() === address)) {
    return { ok: false, message: `${address} already has a console account.` };
  }

  const { data: open } = await supabase
    .from("admin_invites")
    .select("id")
    .eq("email", address)
    .is("consumed_at", null)
    .is("deleted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (open) {
    return { ok: false, message: `${address} already has an invite waiting.` };
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000).toISOString();
  const { data: invite, error } = await supabase
    .from("admin_invites")
    .insert({ email: address, role: consoleRole, invited_by: actor ?? null, expires_at: expiresAt })
    .select("id")
    .single();
  if (error) throw new Error(`invite failed: ${error.message}`);

  // Awaited, unlike every other send in this file, because this one IS the
  // action: an invite whose email never left is an invite that does not exist,
  // and the admin is standing there waiting to know. Everywhere else the email
  // is a side effect of a state change that has already succeeded, and blocking
  // the response on a mail provider would be the wrong trade.
  const delivery = await sendEmail(newTraceId(), adminInvite(address, invite.id as string));

  await recordActivity({
    actorEmail: actor,
    action: "team.invited",
    entityType: "invite",
    entityRef: invite.id as string,
    detail: `${address} as ${ROLE_WORD[consoleRole]} — ${delivery.message}`,
  });
  revalidateConsole();

  // The invite row exists either way, so this is not a failure of the action —
  // it is a partial success the admin has to know about, because the next step
  // is theirs (resend, or send the link another way).
  return delivery.ok
    ? { ok: true }
    : {
        ok: false,
        message: `Invite created, but the email did not go out — ${delivery.message} You can resend it from the team list.`,
      };
}

/**
 * Removes a console account, or withdraws an invite that has not been used.
 *
 * The last Global Admin cannot be removed: an account nobody can administer is
 * unrecoverable without going round the app to the service key, and this
 * control is one mis-click away from that.
 */
export async function removeTeamMember(id: string): Promise<ActionResult> {
  const { email: actor } = await requireCapability("manageTeam");
  const supabase = createAdminClient();

  if (id.startsWith("invite:")) {
    const inviteId = id.slice("invite:".length);
    const { error } = await supabase
      .from("admin_invites")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", inviteId)
      .is("deleted_at", null);
    if (error) throw new Error(`withdrawing the invite failed: ${error.message}`);

    await recordActivity({
      actorEmail: actor,
      action: "team.invite_withdrawn",
      entityType: "invite",
      entityRef: inviteId,
    });
    revalidateConsole();
    return { ok: true };
  }

  const { data: accounts, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw new Error(`team read failed: ${listError.message}`);

  const target = accounts?.users.find((user) => user.id === id);
  if (!target) return { ok: false, message: "That account no longer exists." };

  const globalAdmins = (accounts?.users ?? []).filter(
    (user) => toConsoleRole(user.app_metadata?.role) === "global_admin",
  );
  if (globalAdmins.length <= 1 && toConsoleRole(target.app_metadata?.role) === "global_admin") {
    return {
      ok: false,
      message: "This is the only Global Admin — promote someone else before removing them.",
    };
  }

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) throw new Error(`removing the account failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "team.removed",
    entityType: "account",
    entityRef: id,
    detail: target.email ?? undefined,
  });
  revalidateConsole();
  return { ok: true };
}

// ── Gallery ─────────────────────────────────────────────────────────────────

/** A draft photo's city and caption, typed in the panel before publishing. */
export async function updateGalleryPhoto(
  photoId: string,
  fields: { city?: string; caption?: string },
): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const patch: Record<string, string | null> = {};
  if ("city" in fields) patch.city = fields.city?.trim() || null;
  if ("caption" in fields) patch.caption = fields.caption?.trim() || null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("gallery_photos")
    .update(patch)
    .eq("id", photoId)
    .is("deleted_at", null);
  if (error) throw new Error(`saving the photo details failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "gallery.detail_set",
    entityType: "gallery",
    entityRef: photoId,
  });
  // The landing page renders both fields, so editing a live photo's caption or
  // city changes a public page. Only the console was revalidated here, and the
  // correction sat invisible behind the static render until something else
  // published.
  revalidatePath("/");
  revalidateConsole();
}

/**
 * Takes a live photo back to draft.
 *
 * Distinct from removing it: the photo, its caption and its stored object all
 * survive, so a photo pulled to fix a typo goes back up without re-uploading.
 * The brief asks for publish *and* unpublish; before this the only way off the
 * landing page was deletion, which also destroys the object.
 */
export async function unpublishGalleryPhoto(photoId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("gallery_photos")
    .update({ published: false })
    .eq("id", photoId)
    .eq("published", true)
    .is("deleted_at", null);
  if (error) throw new Error(`unpublish failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "gallery.unpublished",
    entityType: "gallery",
    entityRef: photoId,
  });
  revalidatePath("/");
  revalidateConsole();
}

/**
 * Moves a live photo one place earlier or later in the landing-page carousel.
 *
 * `sort_order` defaults to 0 on every row, so the first move has nothing to
 * swap with — every photo compares equal and the order is decided by the
 * created_at tiebreak. So the whole live set is numbered by its current
 * displayed order first, and only then are two neighbours exchanged. That makes
 * the first move behave like every later one instead of silently doing nothing.
 */
export async function moveGalleryPhoto(
  photoId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data: live, error: readError } = await supabase
    .from("gallery_photos")
    .select("id, sort_order")
    .eq("published", true)
    .is("deleted_at", null)
    // GALLERY_ORDER — the order the landing page renders, so "up" means up.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (readError) throw new Error(`gallery read failed: ${readError.message}`);

  const order = live ?? [];
  const from = order.findIndex((photo) => photo.id === photoId);
  if (from === -1) return { ok: false, message: "That photo is no longer live." };

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= order.length) {
    return { ok: false, message: `That photo is already ${direction === "up" ? "first" : "last"}.` };
  }

  const moved = [...order];
  [moved[from], moved[to]] = [moved[to], moved[from]];

  // Renumber densely from the new arrangement — cheap at twenty rows, and it
  // leaves the column in a state where the next move is a plain swap.
  const writes = moved.map((photo, index) =>
    supabase.from("gallery_photos").update({ sort_order: index }).eq("id", photo.id),
  );
  for (const write of writes) {
    const { error } = await write;
    if (error) throw new Error(`reorder failed: ${error.message}`);
  }

  await recordActivity({
    actorEmail: actor,
    action: "gallery.reordered",
    entityType: "gallery",
    entityRef: photoId,
    detail: `Moved ${direction} to position ${to + 1} of ${moved.length}.`,
  });
  revalidatePath("/");
  revalidateConsole();
  return { ok: true };
}

/**
 * Publishes every draft to "Sessions in the room", evicting the oldest beyond
 * the twenty the section carries.
 *
 * Eviction is a soft delete, not a hard one: a photo pushed off the landing
 * page is still a photo someone chose and captioned, and the participants in it
 * consented to it being used. Losing the record would also lose that.
 *
 * A draft missing its city or caption is refused rather than published blank —
 * the landing page renders both, and the DB constraint would reject it anyway.
 */
export async function publishGalleryDrafts(): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data: drafts, error: draftError } = await supabase
    .from("gallery_photos")
    .select("id, caption, city")
    .eq("published", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id");
  if (draftError) throw new Error(`gallery drafts read failed: ${draftError.message}`);
  if (!drafts || drafts.length === 0) return { ok: false, message: "There is nothing in draft to publish." };

  const incomplete = drafts.filter((photo) => !photo.city?.trim() || !photo.caption?.trim());
  if (incomplete.length > 0) {
    return {
      ok: false,
      message: `Add a city and a caption to ${incomplete.length} draft photo(s) before publishing.`,
    };
  }

  const { error: publishError } = await supabase
    .from("gallery_photos")
    .update({ published: true })
    .in("id", drafts.map((photo) => photo.id));
  if (publishError) throw new Error(`publish failed: ${publishError.message}`);

  // Evict the oldest back down to the limit.
  const { data: live } = await supabase
    .from("gallery_photos")
    .select("id")
    .eq("published", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id");

  const surplus = (live ?? []).slice(0, Math.max(0, (live?.length ?? 0) - GALLERY_LIMIT));
  if (surplus.length > 0) {
    await supabase
      .from("gallery_photos")
      .update({ deleted_at: new Date().toISOString(), published: false })
      .in("id", surplus.map((photo) => photo.id));
  }

  await recordActivity({
    actorEmail: actor,
    action: "gallery.published",
    entityType: "gallery",
    detail:
      `Published ${drafts.length} photo(s) to "Sessions in the room"` +
      (surplus.length ? ` (${surplus.length} oldest auto-removed to stay at ${GALLERY_LIMIT}).` : "."),
  });
  revalidatePath("/");
  revalidateConsole();
  return { ok: true };
}

/** Removes one photo, draft or live, and its stored object. */
export async function removeGalleryPhoto(photoId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("gallery_photos")
    .select("storage_path, published")
    .eq("id", photoId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`gallery photo read failed: ${error.message}`);
  if (!data) throw new Error("that photo is already gone");

  // The object goes first: the bucket is public, so a row removed while the
  // file survives leaves the photo readable at its URL after someone deleted it.
  const { error: removeError } = await supabase.storage.from("gallery").remove([data.storage_path]);
  if (removeError) throw new Error(`removing the stored photo failed: ${removeError.message}`);

  const { error: rowError } = await supabase
    .from("gallery_photos")
    .update({ deleted_at: new Date().toISOString(), published: false })
    .eq("id", photoId)
    .is("deleted_at", null);
  if (rowError) throw new Error(`delete failed: ${rowError.message}`);

  await recordActivity({
    actorEmail: actor,
    action: data.published ? "gallery.unpublished" : "gallery.draft_removed",
    entityType: "gallery",
    entityRef: photoId,
  });
  revalidatePath("/");
  revalidateConsole();
}

// ── Payouts ─────────────────────────────────────────────────────────────────

/** The finance team's own reference for this payment. */
export async function setInvoiceReference(
  assignmentId: string,
  reference: string,
): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const trimmed = reference.trim();

  const { error } = await supabase
    .from("session_practitioners")
    .update({ invoice_reference: trimmed || null })
    .eq("id", assignmentId)
    .is("deleted_at", null);

  if (error) {
    // The reference is unique across live assignments: quoting one number for
    // two payments is how a reconciliation goes wrong, so the collision is
    // reported rather than swallowed.
    if (error.code === "23505") {
      return { ok: false, message: `${trimmed} is already used by another payout.` };
    }
    throw new Error(`saving the invoice reference failed: ${error.message}`);
  }

  await recordActivity({
    actorEmail: actor,
    action: "payout.invoice_set",
    entityType: "assignment",
    entityRef: assignmentId,
    detail: trimmed ? `Invoice ref. ${trimmed}.` : "Invoice ref. cleared.",
  });
  revalidateConsole();
  return { ok: true };
}

/**
 * Marks a payout paid, or reverses it.
 *
 * "Paid" here means the bank transfer has happened — the platform does not move
 * money, it records that someone did. So the date is what matters and it is set
 * to today rather than asked for: an admin marking it paid is asserting it
 * happened now.
 */
export async function setPayoutStatus(assignmentId: string, status: string): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  if (status !== "Paid" && status !== "Pending") {
    throw new Error(`unknown payout status: ${status}`);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .update({ paid_on: status === "Paid" ? new Date().toISOString().slice(0, 10) : null })
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .select("confirmation_reference, gross_payout, currency")
    .maybeSingle();
  if (error) throw new Error(`payout update failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: status === "Paid" ? "payout.paid" : "payout.reopened",
    entityType: "assignment",
    entityRef: assignmentId,
    detail: data ? `${data.confirmation_reference}, ${data.currency} ${data.gross_payout}` : undefined,
  });
  revalidateConsole();
  return { ok: true };
}

// ── Photos ──────────────────────────────────────────────────────────────────

/**
 * Deletes a session's photos (V7's Delete on the Photos tab), which is also how
 * an admin re-uploads: V7 disables Upload once photos exist and says "delete to
 * reupload".
 *
 * The stored objects go with the row. A soft-deleted submission whose files
 * stayed in the bucket would leave identifiable participants' photos live at a
 * signable path after someone deliberately removed them — the retention promise
 * is about the images, not the record of them.
 */
export async function deletePhotoSubmission(submissionId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("photo_submissions")
    .select("id, storage_keys, session_id")
    .eq("id", submissionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`photo submission read failed: ${error.message}`);
  if (!data) throw new Error("those photos are already gone");

  const keys = (data.storage_keys ?? []) as string[];
  if (keys.length > 0) {
    const bucket = process.env.SUPABASE_PHOTOS_BUCKET || "session-photos";
    const { error: removeError } = await supabase.storage.from(bucket).remove(keys);
    // Removing the row while the objects survive is the one order that leaves
    // orphans nothing can reach or expire, so the row stays until they are gone.
    if (removeError) throw new Error(`removing the stored photos failed: ${removeError.message}`);
  }

  const { error: rowError } = await supabase
    .from("photo_submissions")
    .update({ deleted_at: new Date().toISOString(), storage_keys: [] })
    .eq("id", submissionId)
    .is("deleted_at", null);
  if (rowError) throw new Error(`delete failed: ${rowError.message}`);

  await recordActivity({
    actorEmail: actor,
    action: "photos.deleted",
    entityType: "photo_submission",
    entityRef: submissionId,
    detail: `${keys.length} photo(s) removed from storage.`,
  });
  revalidateConsole();
}

// ── Outbound link emails (the external, 15s-held sends) ──────────────────────

async function assignmentContact(id: string): Promise<{ email: string; firstName: string } | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("session_practitioners")
    .select("practitioner_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  return practitionerContact(supabase, data.practitioner_id as string);
}

/**
 * "Generate Confirmation" (V7 tab 4, Part 1).
 *
 * Everything on that form flows from the request and the practitioner record
 * except two things the admin supplies: the start time and the duration. So
 * this writes those onto the SESSION — they are facts about the session, not
 * about the document — and stamps the assignment as confirmed, which is what
 * moves it into Part 2 and makes the consent request sendable.
 *
 * Idempotent: re-generating updates the time and leaves the original generation
 * stamp alone, so the audit trail keeps the date the document first existed.
 */
export async function generateConfirmation(
  assignmentId: string,
  input: { startTime: string; durationHours: number; sessionDate?: string | null },
): Promise<ActionResult> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  if (!/^\d{2}:\d{2}$/.test(input.startTime)) {
    return { ok: false, message: "Enter a start time for the session." };
  }
  if (![3, 6].includes(input.durationHours)) {
    return { ok: false, message: "Choose a duration — 3 hours for a single module, 6 for a bundle." };
  }

  const { data: assignment, error: readError } = await supabase
    .from("session_practitioners")
    .select("id, session_id, confirmation_reference, confirmation_generated_at")
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) throw new Error(`assignment read failed: ${readError.message}`);
  if (!assignment) return { ok: false, message: "That session is no longer available to confirm." };

  const sessionPatch: Record<string, unknown> = {
    start_time: input.startTime,
    duration_minutes: input.durationHours * 60,
    status: "Confirmed",
  };
  // The date is agreed on the same call; a session cannot be confirmed without
  // one, so it is captured here rather than left for a later screen.
  if (input.sessionDate) sessionPatch.session_date = input.sessionDate;

  const { error: sessionError } = await supabase
    .from("sessions")
    .update(sessionPatch)
    .eq("id", assignment.session_id)
    .is("deleted_at", null);
  if (sessionError) throw new Error(`session update failed: ${sessionError.message}`);

  const { error } = await supabase
    .from("session_practitioners")
    .update({
      confirmation_generated_at: assignment.confirmation_generated_at ?? new Date().toISOString(),
      confirmation_issued_on: new Date().toISOString().slice(0, 10),
    })
    .eq("id", assignmentId)
    .is("deleted_at", null);
  if (error) throw new Error(`confirmation update failed: ${error.message}`);

  await recordActivity({
    actorEmail: actor,
    action: assignment.confirmation_generated_at ? "confirmation.regenerated" : "confirmation.generated",
    entityType: "assignment",
    entityRef: assignmentId,
    detail: `${assignment.confirmation_reference} — ${input.startTime}, ${input.durationHours}h.`,
  });
  revalidateConsole();
  return { ok: true };
}

export async function sendConsentRequest(assignmentId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const contact = await assignmentContact(assignmentId);
  if (contact) dispatchEmail(newTraceId(), consentRequest(contact.email, contact.firstName, assignmentId));
  await recordActivity({ actorEmail: actor, action: "consent.requested", entityType: "assignment", entityRef: assignmentId });
}

export async function sendRatingRequest(assignmentId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const contact = await assignmentContact(assignmentId);
  if (contact) dispatchEmail(newTraceId(), ratingRequest(contact.email, contact.firstName, assignmentId));
  await recordActivity({ actorEmail: actor, action: "rating.requested", entityType: "assignment", entityRef: assignmentId });
}

export async function sendPhotoGuide(assignmentId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const contact = await assignmentContact(assignmentId);
  if (contact) dispatchEmail(newTraceId(), photoReminder(contact.email, contact.firstName, assignmentId));
  await recordActivity({ actorEmail: actor, action: "photo_guide.sent", entityType: "assignment", entityRef: assignmentId });
}

/**
 * The Agreements panel's "Delete" — which clears the *signed record*, not the
 * agreement. V7's own confirm text is explicit about it: the agreement returns
 * to Pending and the practitioner's status re-opens to "Agreement Sent", so a
 * fresh signature is picked up automatically. It exists for a signature
 * captured in error.
 *
 * The walk-back is the whole point, and it is why this is not a plain update:
 * clearing the signature while leaving the practitioner Empanelled would leave
 * a practitioner empanelled by a signature the system no longer holds.
 */
export async function clearSignedAgreement(agreementId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();

  const { data: agreement, error } = await supabase
    .from("practitioner_agreements")
    .update({
      signed_at: null,
      signed_name: null,
      signed_designation: null,
      signature_data: null,
      signature_mode: null,
      signed_ip: null,
    })
    .eq("id", agreementId)
    .is("deleted_at", null)
    .select("practitioner_id, reference")
    .maybeSingle();
  if (error) throw new Error(`clearing the signed agreement failed: ${error.message}`);
  if (!agreement) throw new Error("that agreement no longer exists");

  const practitionerId = agreement.practitioner_id as string;
  const { data: practitioner } = await supabase
    .from("practitioners")
    .update({ status: "Pending" })
    .eq("id", practitionerId)
    .is("deleted_at", null)
    .eq("status", "Empanelled")
    .select("application_id")
    .maybeSingle();

  if (practitioner?.application_id) {
    await supabase
      .from("practitioner_applications")
      .update({ status: "Agreement Sent" })
      .eq("id", practitioner.application_id);
  }

  await recordActivity({
    actorEmail: actor,
    action: "agreement.signature_cleared",
    entityType: "agreement",
    entityRef: agreementId,
    detail: `Cleared the signed record for ${agreement.reference} — reset to Pending and re-opened the practitioner to Agreement Sent.`,
  });
  revalidateConsole();
}

export async function sendAgreement(agreementId: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("practitioner_agreements")
    .select("practitioner_id")
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();
  const contact = data ? await practitionerContact(supabase, data.practitioner_id as string) : null;
  if (contact) dispatchEmail(newTraceId(), onboardingLink(contact.email, contact.firstName, agreementId));
  await recordActivity({ actorEmail: actor, action: "agreement.sent", entityType: "agreement", entityRef: agreementId });
}
