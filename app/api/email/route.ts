import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { sendEmail } from "@/lib/email/brevo";
import {
  availabilityCheckEmail,
  agreementLinkEmail,
  clientFollowUpEmail,
  sessionConfirmationEmail,
} from "@/lib/email/templates";
import { z } from "zod";

const Schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("availability"),
    to: z.string().email(),
    name: z.string(),
    topic: z.string(),
    audienceType: z.string(),
    groupSize: z.string(),
    preferredDates: z.string(),
    city: z.string().optional(),
  }),
  z.object({
    type: z.literal("agreement-link"),
    to: z.string().email(),
    name: z.string(),
    onboardingUrl: z.string().url(),
  }),
  z.object({
    type: z.literal("client-followup"),
    to: z.string().email(),
    name: z.string(),
    topic: z.string(),
    groupSize: z.string(),
    audienceType: z.string(),
    preferredDates: z.string(),
  }),
  z.object({
    type: z.literal("session-confirmation"),
    to: z.string().email(),
    name: z.string(),
    refCode: z.string(),
    module: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    venue: z.string(),
    participants: z.number(),
    grossAmount: z.number(),
    tdsAmount: z.number(),
    netAmount: z.number(),
    tdsRate: z.number(),
    consentUrl: z.string().url(),
  }),
]);

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = Schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const d = body.data;
  let email: { subject: string; htmlContent: string };

  if (d.type === "availability") {
    email = availabilityCheckEmail(d.name, {
      topic: d.topic,
      audienceType: d.audienceType,
      groupSize: d.groupSize,
      preferredDates: d.preferredDates,
      city: d.city,
    });
  } else if (d.type === "agreement-link") {
    email = agreementLinkEmail(d.name, d.onboardingUrl);
  } else if (d.type === "client-followup") {
    email = clientFollowUpEmail(d.name, {
      topic: d.topic,
      groupSize: d.groupSize,
      audienceType: d.audienceType,
      preferredDates: d.preferredDates,
    });
  } else {
    email = sessionConfirmationEmail(d.name, {
      refCode: d.refCode,
      module: d.module,
      date: d.date,
      startTime: d.startTime,
      endTime: d.endTime,
      venue: d.venue,
      participants: d.participants,
      grossAmount: d.grossAmount,
      tdsAmount: d.tdsAmount,
      netAmount: d.netAmount,
      tdsRate: d.tdsRate,
      consentUrl: d.consentUrl,
    });
  }

  try {
    await sendEmail({ to: d.to, name: d.name, ...email });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[POST /api/email]", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
