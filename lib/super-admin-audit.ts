import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

export async function logSuperAdminAction({
  actorEmail,
  action,
  recordTable,
  recordId,
  snapshot,
}: {
  actorEmail: string;
  action: string;
  recordTable: string;
  recordId: string;
  snapshot?: Record<string, unknown> | null;
}) {
  const { error } = await createAdminClient()
    .from("super_admin_audit_log")
    .insert({
      actor_email:  actorEmail,
      action,
      record_table: recordTable,
      record_id:    recordId,
      snapshot:     snapshot ?? null,
    });
  if (error) {
    log.error("Super admin audit log write failed", { error: error.message, action, recordId });
  }
}
