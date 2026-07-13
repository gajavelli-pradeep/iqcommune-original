import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, type ActorRole } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

type Db = ReturnType<typeof createAdminClient>;

export type PayoutSummary = {
  id: string;
  invoice_ref: string;
  gross_amount: number;
  net_amount: number;
};

export type CreatePayoutResult =
  | { ok: true; created: boolean; payout: PayoutSummary }
  | { ok: false; code: "not_found" | "not_completed" | "insert_error"; message: string };

// Single source of truth for turning a Completed session into a Pending payout.
// Idempotent: if a payout already exists for the session it is returned with
// `created: false` instead of erroring. Called by the manual "Create payout" route
// and by the automatic on-completion hook in the session-status route.
// Passing `actor` records a `create_payout` entry in the activity log on a new insert.
export async function createPayoutForSession(
  supabase: Db,
  sessionId: string,
  actor?: { email: string; role: ActorRole }
): Promise<CreatePayoutResult> {
  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, ref_code, module, practitioner_id, payout_amount, tds_applicable, tds_rate, status")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    log.error("Create payout: session not found", { sessionId, error: fetchErr?.message });
    return { ok: false, code: "not_found", message: "Session not found" };
  }

  if (session.status !== "Completed") {
    return { ok: false, code: "not_completed", message: "Payout can only be created for Completed sessions" };
  }

  const { data: existing } = await supabase
    .from("payouts")
    .select("id, invoice_ref, gross_amount, net_amount")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return { ok: true, created: false, payout: existing as PayoutSummary };
  }

  const gross = session.payout_amount as number;
  const tdsRate = session.tds_applicable && session.tds_rate ? (session.tds_rate as number) : 0;
  const tdsAmount = Math.round((gross * tdsRate) / 100);
  const net = gross - tdsAmount;

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const invoiceRef = `INV-${session.ref_code}-${ym}`;

  // NOTE: net_amount already reflects the TDS deduction, so the TDS *rate* is not
  // persisted on the payout — the `payouts` table's remote schema doesn't expose a
  // `tds_rate` column (PostgREST schema-cache), and the rate is derivable from the
  // session if ever needed. Writing it here previously 500'd the (gated) insert.
  const { data: payout, error: insertErr } = await supabase
    .from("payouts")
    .insert({
      session_id: sessionId,
      practitioner_id: session.practitioner_id as string,
      invoice_ref: invoiceRef,
      gross_amount: gross,
      net_amount: net,
      status: "Pending",
    })
    .select("id, invoice_ref, gross_amount, net_amount")
    .single();

  if (insertErr || !payout) {
    log.error("Create payout: insert failed", { error: insertErr?.message, sessionId });
    return { ok: false, code: "insert_error", message: "Failed to create payout" };
  }

  log.info("Payout created", { payoutId: payout.id, sessionId, invoiceRef, gross, net });

  if (actor) {
    await logActivity({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "create_payout",
      recordTable: "payouts",
      recordId: payout.id,
      snapshot: { invoice_ref: invoiceRef, session_ref: session.ref_code, after: { status: "Pending", gross, net } },
    });
  }

  return { ok: true, created: true, payout: payout as PayoutSummary };
}
