import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { minCommitmentFor } from "@/constants/group-sizes";
import type { SessionRequestInput } from "@/lib/schemas/session-request";

/**
 * The only place session requests are written — F2's service pattern.
 *
 * Routes handle HTTP; services handle data. Keeping the Supabase call here
 * means the route never grows a query, and the mapping from camelCase input to
 * snake_case columns lives in exactly one file.
 */

export interface CreatedSessionRequest {
  id: string;
  createdAt: string;
}

export async function createSessionRequest(
  input: SessionRequestInput,
): Promise<CreatedSessionRequest> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("session_requests")
    .insert({
      audience: input.audience,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      city: input.city,
      state: input.state,
      organisation_name: input.organisationName || null,
      topic: input.topic,
      group_size: input.groupSize || null,
      min_commitment: minCommitmentFor(input.groupSize),
      preferred_window: input.preferredWindow || null,
      venue_details: input.venueDetails || null,
      notes: input.notes || null,
      spoc_confirmed: input.spocConfirmed,
    })
    .select("id, created_at")
    .single();

  if (error) throw new Error(`session_requests insert failed: ${error.message}`);
  return { id: data.id, createdAt: data.created_at };
}