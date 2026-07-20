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

  // The signed confirmation is the single source of truth for the agreed figures — it is
  // the document the practitioner actually consented to, and it is the only place GST is
  // recorded. Deriving from the session instead used to ignore GST entirely and read a
  // TDS flag that defaults off, so a payout could read net == gross while the signed PDF
  // said "TDS 10%, GST 18%".
  const { data: confirmation } = await supabase
    .from("confirmations")
    .select("ref_code, gross_amount, net_amount, tds_rate, gst_rate")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .neq("status", "Superseded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let gross: number;
  let net: number;
  if (confirmation) {
    gross = confirmation.gross_amount as number;
    net = confirmation.net_amount as number;
  } else {
    // No consent on record (a session completed without one). Fall back to the session's
    // own figures and say so — a payout with no signed basis is worth noticing.
    gross = session.payout_amount as number;
    const tdsRate = session.tds_applicable && session.tds_rate ? (session.tds_rate as number) : 0;
    net = gross - Math.round((gross * tdsRate) / 100);
    log.warn("Create payout: no active confirmation for session — falling back to session figures", {
      sessionId, sessionRef: session.ref_code, gross, net,
    });
  }

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const invoiceRef = `INV-${session.ref_code}-${ym}`;

  // NOTE: `pay_to` is intentionally left NULL here. It is a *manual override* only —
  // when NULL the console derives the destination from the practitioner's (decrypted)
  // UPI / bank on display. Copying the encrypted upi_id in here would persist
  // ciphertext, so prefill happens at the display layer, not at rest.
  // NOTE: gross/net are copied verbatim from the signed confirmation, so the rates are
  // not persisted on the payout — the `payouts` table's remote schema doesn't expose
  // rate columns (PostgREST schema-cache), and both rates remain on the confirmation.
  // Writing them here previously 500'd the (gated) insert.
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
