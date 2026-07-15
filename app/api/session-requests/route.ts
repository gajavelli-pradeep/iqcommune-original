import { NextRequest, NextResponse } from "next/server";
import { SessionRequestSchema } from "@/lib/schemas/session-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { sendEmail } from "@/lib/email/brevo";
import { clientFollowUpEmail, newSessionRequestAdminEmail } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend, recordEmailMessageId } from "@/lib/email/idempotency";
import { notifyAdmin } from "@/lib/email/notify-admin";
import { getBaseUrl } from "@/lib/base-url";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(reset) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("session_requests")
    .insert({
      name:             `${d.firstName} ${d.lastName}`,
      email:            d.email,
      phone:            d.phone,
      city:             d.city,
      state:            d.state,
      audience_type:    d.audienceType,
      org_name:         d.orgName?.trim() || null,
      topic:            d.topic,
      group_size:       d.groupSize ?? null,
      min_commit:       d.minCommit ?? null,
      venue:            d.audienceType === "Groups" ? (d.venue ?? null) : null,
      preferred_dates:  d.preferredDates ?? null,
      notes:            d.notes ?? null,
      spoc_declaration: true,
      status:           "New",
    })
    .select("id")
    .single();

  if (error) {
    log.error("Failed to save session request", { error: error.message, ip });
    const msg = process.env.NODE_ENV === "development" ? error.message : "Failed to save request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const requestId = data.id as string;

  // Send client confirmation (idempotent — safe on retry)
  const alreadySent = await guardEmailSend("session_request_received", requestId, d.email);
  if (!alreadySent) {
    try {
      const { subject, htmlContent } = clientFollowUpEmail(
        `${d.firstName} ${d.lastName}`,
        {
          topic:          d.topic,
          groupSize:      d.groupSize ?? "—",
          audienceType:   d.audienceType,
          preferredDates: d.preferredDates ?? "Flexible",
        }
      );
      const { messageId } = await sendEmail({ to: d.email, name: `${d.firstName} ${d.lastName}`, subject, htmlContent });
      await recordEmailMessageId("session_request_received", requestId, messageId);
    } catch (emailErr) {
      log.error("Session request confirmation email failed — revoking sentinel so it can retry", { error: String(emailErr), requestId });
      await revokeEmailSend("session_request_received", requestId);
    }
  }

  // Notify the internal team of the new request (best-effort, idempotent).
  const adminMail = newSessionRequestAdminEmail({
    name:           `${d.firstName} ${d.lastName ?? ""}`.trim(),
    topic:          d.topic,
    audienceType:   d.audienceType,
    groupSize:      d.groupSize ?? "",
    orgName:        d.orgName?.trim() || undefined,
    city:           d.city,
    state:          d.state,
    preferredDates: d.preferredDates,
    email:          d.email,
    phone:          d.phone,
    consoleUrl:     `${getBaseUrl(req)}/console`,
  });
  await notifyAdmin({
    emailType:   "admin_new_session_request",
    entityId:    requestId,
    subject:     adminMail.subject,
    htmlContent: adminMail.htmlContent,
  });

  return NextResponse.json({ id: requestId }, { status: 201 });
}
