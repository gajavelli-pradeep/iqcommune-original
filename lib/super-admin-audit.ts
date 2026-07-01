import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export type ActorRole = "admin" | "super_admin";

/**
 * Append one row to the activity/audit log. Covers BOTH super-admin governance
 * actions and regular-admin pipeline actions — `actorRole` distinguishes them.
 *
 * For change actions, pass `snapshot: { before, after }` to record the full trail.
 * Best-effort: a failed audit write is logged but never rolls back the caller's
 * action (availability of the real action beats a hard audit guarantee at this scale).
 */
export async function logActivity({
  actorEmail,
  actorRole = "super_admin",
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
    .from("super_admin_audit_log")
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
 * Backwards-compatible wrapper for the original super-admin-only call sites.
 * Equivalent to logActivity with actorRole = 'super_admin'.
 */
export async function logSuperAdminAction(args: {
  actorEmail: string;
  action: string;
  recordTable: string;
  recordId: string;
  snapshot?: Record<string, unknown> | null;
}) {
  return logActivity({ ...args, actorRole: "super_admin" });
}
