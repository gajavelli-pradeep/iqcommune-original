import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ApplicationInput } from "@/lib/schemas/application";

/**
 * The only place practitioner applications are written.
 *
 * No `|| null` coercions here, unlike `session-requests`: every field in
 * `applicationSchema` is required, so an optional would be a schema change
 * rather than an empty string.
 */

export interface CreatedApplication {
  id: string;
  createdAt: string;
}

export async function createApplication(
  input: ApplicationInput,
): Promise<CreatedApplication> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("practitioner_applications")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      job_title: input.jobTitle,
      experience_band: input.experience,
      city: input.city,
      state: input.state,
      address: input.address,
      tshirt_size: input.tshirtSize,
      modules: input.modules,
      teaching_frequency: input.frequency,
      motivation: input.motivation,
      consent_disclosure: input.consentDisclosure,
      consent_no_cross_sell: input.consentNoCrossSell,
      consent_employer: input.consentEmployer,
    })
    .select("id, created_at")
    .single();

  if (error) throw new Error(`practitioner_applications insert failed: ${error.message}`);
  return { id: data.id, createdAt: data.created_at };
}