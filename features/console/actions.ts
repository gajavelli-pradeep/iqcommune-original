"use server";

import { revalidatePath } from "next/cache";

import { dispatchEmail } from "@/lib/email/dispatch";
import {
  applicationRejected,
  consentRequest,
  onboardingLink,
  photoReminder,
  practitionerDeactivated,
  practitionerWelcome,
  ratingRequest,
} from "@/lib/email/templates";
import { newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordActivity } from "@/services/console";

import { requireCapability } from "./requireRole";

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

export async function matchSessionRequest(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("session_requests")
    .update({ status: "Matched" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`match failed: ${error.message}`);
  await recordActivity({ actorEmail: actor, action: "request.matched", entityType: "request", entityRef: id });
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
  kind: "practitioner" | "agreement",
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
