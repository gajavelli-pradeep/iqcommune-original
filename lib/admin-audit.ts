import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export type ActorRole = "admin" | "global_admin";

/**
 * Append one row to the activity/audit log. Covers BOTH global-admin governance
 * actions and regular-admin pipeline actions — `actorRole` distinguishes them.
 *
 * For change actions, pass `snapshot: { before, after }` to record the full trail.
 * Best-effort: a failed audit write is logged but never rolls back the caller's
 * action (availability of the real action beats a hard audit guarantee at this scale).
 */
export async function logActivity({
  actorEmail,
  actorRole = "global_admin",
  action,
  recordTable,
  recordId,
  snapshot,
}: {
  actorEmail: string;
  actorRole?: ActorRole;
  action: string;
  recordTable: string;
  recordId: string;
  snapshot?: Record<string, unknown> | null;
}) {
  const { error } = await createAdminClient()
    .from("admin_audit_log")
    .insert({
      actor_email:  actorEmail,
      actor_role:   actorRole,
      action,
      record_table: recordTable,
      record_id:    recordId,
      snapshot:     snapshot ?? null,
    });
  if (error) {
    log.error("Activity log write failed", { error: error.message, action, recordId });
  }
}

/**
 * Backwards-compatible wrapper for the original global-admin-only call sites.
 * Equivalent to logActivity with actorRole = 'global_admin'.
 */
export async function logAdminAction(args: {
  actorEmail: string;
  action: string;
  recordTable: string;
  recordId: string;
  snapshot?: Record<string, unknown> | null;
}) {
  return logActivity({ ...args, actorRole: "global_admin" });
}
