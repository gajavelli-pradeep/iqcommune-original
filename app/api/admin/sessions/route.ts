import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("sessions")
    .select("*, practitioner:practitioners(name, email)")
    .is("deleted_at", null)
    .order("session_date", { ascending: true });

  if (error) {
    log.error("Sessions GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

const CreateSessionSchema = z.object({
  refCode:        z.string().min(1),
  module:         z.string().min(1),
  practitionerId: z.string().uuid(),
  sessionDate:    z.string().min(1),
  startTime:      z.string().min(1),
  endTime:        z.string().min(1),
  venue:          z.string().min(1),
  audienceType:   z.string().min(1),
  participants:   z.number().int().min(1),
  payoutAmount:   z.number().int().min(1),
  tdsApplicable:  z.boolean().default(false),
  tdsRate:        z.number().min(0).max(100).optional(),
  requestId:      z.string().uuid().optional(),
}).superRefine((d, ctx) => {
  if (d.tdsApplicable && (!d.tdsRate || d.tdsRate <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "TDS rate is required when TDS is applicable",
      path: ["tdsRate"],
    });
  }
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = CreateSessionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const d = body.data;
  const { data, error } = await createAdminClient()
    .from("sessions")
    .insert({
      ref_code:        d.refCode,
      module:          d.module,
      practitioner_id: d.practitionerId,
      session_date:    d.sessionDate,
      start_time:      d.startTime,
      end_time:        d.endTime,
      venue:           d.venue,
      audience_type:   d.audienceType,
      participants:    d.participants,
      payout_amount:   d.payoutAmount,
      tds_applicable:  d.tdsApplicable,
      tds_rate:        d.tdsRate ?? null,
      request_id:      d.requestId ?? null,
      consent_status:  "Pending consent",
      status:          "Upcoming",
    })
    .select("id")
    .single();

  if (error) {
    log.error("Session POST failed", { error: error.message });
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "create_session", recordTable: "sessions", recordId: data.id,
      snapshot: { ref_code: d.refCode, module: d.module, session_date: d.sessionDate },
    });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
