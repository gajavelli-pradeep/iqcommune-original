import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signRatingUrl } from "@/lib/hmac";
import { getBaseUrl } from "@/lib/base-url";
import { sendEmail } from "@/lib/email/brevo";
import { ratingRequestEmail } from "@/lib/email/templates";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

/**
 * V6 "Seek Feedback → Send email": email the session's REQUESTOR (SPOC, from the
 * linked session_request — never the practitioner) their signed rating link.
 *
 * GET  → build the prefilled, editable draft (mints the link, does NOT send) for
 *        the §3 editable send-preview.
 * POST → send it. Accepts the admin's live-edited { subject, body } from the
 *        preview; falls back to the template when absent. The signed link is
 *        appended if an edit dropped it, so the closed loop can never break.
 */

async function resolve(id: string, baseUrl: string) {
  const supabase = createAdminClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .select("ref_code, status, request_id, practitioner:practitioners(name)")
    .eq("id", id)
    .single();
  if (error || !session) return { error: "Session not found", status: 404 as const };
  if (session.status !== "Completed") return { error: "Feedback can only be sought for Completed sessions.", status: 422 as const };
  if (!session.request_id) return { error: "This session has no linked request, so there's no requestor to email.", status: 409 as const };

  const { data: request, error: rErr } = await supabase
    .from("session_requests")
    .select("name, email")
    .eq("id", session.request_id)
    .single();
  if (rErr || !request) return { error: "Requestor not found", status: 404 as const };
  if (!request.email) return { error: "No email address on file for the requestor.", status: 409 as const };

  const practitionerName = (session.practitioner as { name: string } | null)?.name ?? "the practitioner";
  const link = signRatingUrl(session.ref_code ?? "", baseUrl);
  const tpl = ratingRequestEmail(request.name ?? "", practitionerName, link, session.ref_code ?? "");
  return { to: request.email, name: request.name ?? "", subject: tpl.subject, link, refCode: session.ref_code ?? "" };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const r = await resolve(id, getBaseUrl(req));
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const body =
    `Hi ${r.name?.split(" ")[0] || "there"},\n\n` +
    `Thank you for hosting a session with us. We'd love a quick rating out of 5 — it takes less than a minute.\n\n` +
    `Rate the session: ${r.link}\n\n` +
    `Warm regards,\nThe iqcommune team`;
  return NextResponse.json({ to: r.to, name: r.name, subject: r.subject, body, link: r.link });
}

const PostBody = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const baseUrl = getBaseUrl(req);

  const raw = await req.json().catch(() => ({}));
  const parsed = PostBody.safeParse(raw);
  const edited = parsed.success ? parsed.data : {};

  const r = await resolve(id, baseUrl);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  // Use the edited content when provided; guarantee the signed link is present.
  let htmlContent: string;
  let subject = r.subject;
  if (edited.body) {
    const withLink = edited.body.includes(r.link) ? edited.body : `${edited.body}\n\n${r.link}`;
    htmlContent = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.7;color:#14120c;max-width:560px;margin:0 auto">${withLink
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .split("\n").map((l) => (l.trim() ? `<p style="margin:0 0 12px">${l}</p>` : "<br/>")).join("")}</div>`;
    if (edited.subject) subject = edited.subject;
  } else {
    const practitionerName = "the practitioner";
    htmlContent = ratingRequestEmail(r.name, practitionerName, r.link, r.refCode).htmlContent;
  }

  try {
    const { messageId } = await sendEmail({ to: r.to, name: r.name || undefined, subject, htmlContent });
    const actor = await getAdminUser();
    await logActivity({
      actorEmail: actor?.email ?? "unknown",
      actorRole: actor?.role ?? "admin",
      action: "send_rating_request",
      recordTable: "sessions",
      recordId: id,
      snapshot: { to: r.to, messageId, edited: !!edited.body },
    });
    return NextResponse.json({ ok: true, sentTo: r.to });
  } catch (err) {
    log.error("Rating request send failed", { error: (err as Error).message, sessionId: id });
    return NextResponse.json({ error: "Couldn't send the email automatically. Please try again." }, { status: 502 });
  }
}
