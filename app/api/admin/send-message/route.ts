import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { sendEmail } from "@/lib/email/brevo";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

// V6 §3: generic outbound-message send for the editable send-preview. Used by the
// informational (Type A) sends — welcome / rejection / deactivation / follow-up /
// cancellation — where the admin's live-edited subject + body are what goes out
// (the closed-loop Type B sends keep their dedicated link-minting routes).

const Body = z.object({
  to: z.string().email(),
  name: z.string().max(200).optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
  kind: z.string().max(60).optional(), // e.g. "welcome-practitioner" — for the audit trail
});

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { to, name, subject, body, kind } = parsed.data;

  // Wrap the plain-text (possibly edited) body in a minimal branded HTML shell.
  const htmlContent = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.7;color:#14120c;max-width:560px;margin:0 auto">${esc(
    body,
  )
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px">${line}</p>` : "<br/>"))
    .join("")}</div>`;

  try {
    const { messageId } = await sendEmail({ to, name, subject, htmlContent });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: actor?.role ?? "admin",
      action: kind ? `send_message:${kind}` : "send_message",
      recordTable: "messages",
      recordId: to,
      snapshot: { to, subject, messageId },
    });
    return NextResponse.json({ ok: true, sentTo: to });
  } catch (err) {
    log.error("Generic message send failed", { error: (err as Error).message, to });
    return NextResponse.json({ error: "Couldn't send the message. Please try again." }, { status: 502 });
  }
}
