import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

// Brevo transactional delivery webhook. Configure the endpoint in Brevo as
//   https://<host>/api/webhooks/brevo?token=<BREVO_WEBHOOK_SECRET>
// Brevo doesn't sign transactional events, so the shared secret in the query string
// is the auth. Events refine a confirmation's email_status from 'sent' →
// 'delivered' / 'bounced'. We only ever touch rows still marked 'sent', so a late
// event can't relabel a confirmation whose send explicitly failed or that already
// progressed. Ack 200 quickly for anything we can't act on (unknown/ignored events)
// so Brevo doesn't spam retries — but a DB failure returns 5xx on purpose, because a
// 200 tells Brevo the event was handled and it will never send it again.

const DELIVERED = new Set(["delivered"]);
const BOUNCED = new Set(["hard_bounce", "soft_bounce", "blocked", "spam", "invalid_email", "error"]);

export async function POST(req: NextRequest) {
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret) {
    log.error("Brevo webhook hit but BREVO_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (req.nextUrl.searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const rawId = body["message-id"] ?? body.messageId;
  if (typeof rawId !== "string" || !rawId) {
    return NextResponse.json({ ok: true }); // nothing to map
  }
  // Brevo's send API wraps the id in angle brackets, the webhook doesn't — we store
  // it bare (see brevo.ts), so strip any brackets here too before the lookup.
  const messageId = rawId.replace(/^<|>$/g, "");

  const emailStatus = DELIVERED.has(event) ? "delivered" : BOUNCED.has(event) ? "bounced" : null;
  if (!emailStatus) {
    return NextResponse.json({ ok: true }); // opens/clicks/deferred etc. — ignore
  }

  const supabase = createAdminClient();
  const { data: sentRow, error: lookupErr } = await supabase
    .from("sent_emails")
    .select("entity_id, email_type")
    .eq("brevo_message_id", messageId)
    .maybeSingle();

  // A failed lookup is NOT "not ours". Ack'ing 200 here would discard the event for
  // good — Brevo doesn't redeliver a 200 — so a DB blip would permanently lose a
  // bounce and leave the row reading 'sent' forever. 5xx makes Brevo retry instead.
  if (lookupErr) {
    log.error("Brevo webhook: sent_emails lookup failed", { error: lookupErr.message, code: lookupErr.code, messageId });
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  // Genuinely unknown message (e.g. a send whose messageId was never persisted).
  if (!sentRow) return NextResponse.json({ ok: true });

  // Every email type keeps a ledger status; only consent emails additionally carry a
  // confirmation row to refine. Both writes are idempotent, so a Brevo retry after a
  // partial failure re-applies the same values safely.
  const { error: ledgerErr } = await supabase
    .from("sent_emails")
    .update({ status: emailStatus === "delivered" ? "sent" : "bounced" })
    .eq("brevo_message_id", messageId);
  if (ledgerErr) {
    log.error("Brevo webhook: sent_emails update failed", { error: ledgerErr.message, messageId, event });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (sentRow.email_type === "session_confirmation") {
    const { error: confErr } = await supabase
      .from("confirmations")
      .update({ email_status: emailStatus })
      .eq("id", sentRow.entity_id)
      .eq("email_status", "sent"); // don't overwrite 'failed' or an already-refined status
    if (confErr) {
      log.error("Brevo webhook: confirmations update failed", { error: confErr.message, messageId, confirmationId: sentRow.entity_id });
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
