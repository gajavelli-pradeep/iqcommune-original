import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
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

const PatchSchema = z.object({ status: z.enum(VALID_STATUSES) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from("practitioners")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // V5 P1-3: Empanel/Reject are one-way gates. Record the status they came from in
  // prev_status so the Danger Zone can offer a Revert. Any other transition clears
  // prev_status (nothing to revert once the practitioner moves on).
  const { data: current } = await supabase
    .from("practitioners")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const isOneWayGate = body.data.status === "Empanelled" || body.data.status === "Rejected";

  const { data: updated, error } = await supabase
    .from("practitioners")
    .update({
      status: body.data.status,
      prev_status: isOneWayGate ? (current?.status ?? null) : null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Practitioner PATCH failed", { error: error.message, practitionerId: id });
    return NextResponse.json({ error: "Failed to update practitioner" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
