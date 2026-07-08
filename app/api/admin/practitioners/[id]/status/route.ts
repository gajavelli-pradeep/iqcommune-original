import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

const VALID_STATUSES = [
  "Applied",
  "Under Review",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
  "Rejected",
] as const;

const Body = z.object({ status: z.enum(VALID_STATUSES) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Body.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: prev } = await supabase
    .from("practitioners")
    .select("status, name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("practitioners")
    .update({ status: body.data.status })
    .eq("id", id);

  if (error) {
    log.error("Practitioner status PATCH failed", { error: error.message, practitionerId: id });
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email, actorRole: actor.role,
      action: "update_practitioner_status", recordTable: "practitioners", recordId: id,
      snapshot: { name: prev?.name, before: { status: prev?.status ?? null }, after: { status: body.data.status } },
    });
  }
  return new NextResponse(null, { status: 204 });
}
