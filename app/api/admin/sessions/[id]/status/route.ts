import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

// The console operator (Admin+) sets a session's delivery status. Completed unlocks
// Photos + Payouts; Cancelled drops it from the consent-eligible list — both are
// read-side filters, so persisting the status is all that's required here.
const VALID_STATUSES = ["Upcoming", "Completed", "Cancelled"] as const;
const Body = z.object({ status: z.enum(VALID_STATUSES) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = Body.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: prev } = await supabase
    .from("sessions")
    .select("status, ref_code")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("sessions")
    .update({ status: body.data.status })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    log.error("Session status PATCH failed", { error: error.message, sessionId: id });
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "update_session_status",
      recordTable: "sessions",
      recordId: id,
      snapshot: {
        ref_code: prev.ref_code,
        before: { status: prev.status },
        after: { status: body.data.status },
      },
    });
  }

  return new NextResponse(null, { status: 204 });
}
