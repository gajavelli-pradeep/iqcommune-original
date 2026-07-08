import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

const Body = z.object({
  practitionerId: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "practitionerId is required (UUID)", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: practitioner, error: pErr } = await supabase
    .from("practitioners")
    .select("name")
    .eq("id", body.data.practitionerId)
    .single();

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("session_requests")
    .update({ status: "Matched", assigned_to: body.data.practitionerId })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Assign practitioner failed", { error: error.message, requestId: id });
    return NextResponse.json({ error: "Failed to assign practitioner" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Session request not found" }, { status: 404 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "assign_practitioner", recordTable: "session_requests", recordId: id,
      snapshot: { assigned_to: body.data.practitionerId, practitioner_name: practitioner.name, after: { status: "Matched" } },
    });
  }
  return NextResponse.json({ assignedTo: practitioner.name }, { status: 200 });
}
