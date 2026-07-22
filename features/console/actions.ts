"use server";

import { revalidatePath } from "next/cache";

import { dispatchEmail } from "@/lib/email/dispatch";
import {
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

export async function empanelPractitioner(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("practitioners")
    .update({ status: "Empanelled" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`empanel failed: ${error.message}`);

  const contact = await practitionerContact(supabase, id);
  if (contact) dispatchEmail(newTraceId(), practitionerWelcome(contact.email, contact.firstName));
  await recordActivity({ actorEmail: actor, action: "practitioner.empanelled", entityType: "practitioner", entityRef: id });
  revalidateConsole();
}

export async function deactivatePractitioner(id: string): Promise<void> {
  const { email: actor } = await requireCapability("mutate");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("practitioners")
    .update({ status: "Deactivated" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(`deactivate failed: ${error.message}`);

  const contact = await practitionerContact(supabase, id);
  if (contact) dispatchEmail(newTraceId(), practitionerDeactivated(contact.email, contact.firstName));
  await recordActivity({ actorEmail: actor, action: "practitioner.deactivated", entityType: "practitioner", entityRef: id });
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
