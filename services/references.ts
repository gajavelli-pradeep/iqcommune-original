import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * The four human-quotable reference sequences, allocated by Postgres.
 *
 * Shared rather than private to the console because the empanelment number is
 * no longer allocated there: an IQC-EMP is issued when a signature empanels
 * someone (`services/link-writes.ts`), and an IQC-AGR when an admin issues the
 * agreement (`features/console/actions.ts`). Two callers, one allocator — a
 * second copy would be a second place for the sequence names to drift.
 *
 * A sequence rather than `max(reference) + 1` on purpose: two admins promoting
 * at the same moment would otherwise read the same maximum and mint the same
 * number, and the column is unique, so one of them would simply fail.
 */
export type ReferenceKind = "practitioner" | "agreement" | "session" | "confirmation";

/** Asks Postgres for the next reference (migration 0008) — see the sequence note there. */
export async function nextReference(
  supabase: ReturnType<typeof createAdminClient>,
  kind: ReferenceKind,
): Promise<string> {
  const { data, error } = await supabase.rpc("next_reference", { kind });
  if (error || !data) {
    throw new Error(`could not allocate a ${kind} reference: ${error?.message ?? "no value"}`);
  }
  return data as string;
}
