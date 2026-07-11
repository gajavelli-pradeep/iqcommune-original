import { NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { z } from "zod";

export const dynamic = "force-dynamic";

type PractUpdate = Database["public"]["Tables"]["practitioners"]["Update"];

// V5 P1-3: the reversible lifecycle actions behind the Danger Zone.
// - deactivate: park an active practitioner (remembers the status to restore).
// - reactivate: restore a deactivated practitioner to that remembered status.
// - revert:     undo a one-way Empanel/Reject back to its prior status.
const Body = z.object({ action: z.enum(["deactivate", "reactivate", "revert"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: p } = await supabase
    .from("practitioners")
    .select("status, prev_status, prev_active_status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!p) return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });

  let update: PractUpdate;
  let nextStatus: string;

  switch (body.data.action) {
    case "deactivate":
      if (p.status === "Deactivated") {
        return NextResponse.json({ error: "Already deactivated" }, { status: 409 });
      }
      nextStatus = "Deactivated";
      update = { status: "Deactivated", prev_active_status: p.status };
      break;
    case "reactivate":
      if (p.status !== "Deactivated") {
        return NextResponse.json({ error: "Practitioner is not deactivated" }, { status: 409 });
      }
      nextStatus = p.prev_active_status ?? "Applied";
      update = { status: nextStatus, prev_active_status: null };
      break;
    case "revert":
      if (!p.prev_status) {
        return NextResponse.json({ error: "Nothing to revert" }, { status: 409 });
      }
      nextStatus = p.prev_status;
      update = { status: p.prev_status, prev_status: null };
      break;
  }

  const { error } = await supabase
    .from("practitioners")
    .update(update)
    .eq("id", id)
    .is("deleted_at", null);
  if (error) {
    log.error("Practitioner lifecycle update failed", { error: error.message, practitionerId: id, action: body.data.action });
    return NextResponse.json({ error: "Failed to update practitioner" }, { status: 500 });
  }

  const actor = await getAdminUser();
  if (actor) {
    await logActivity({
      actorEmail: actor.email,
      actorRole: actor.role,
      action: `practitioner_${body.data.action}`,
      recordTable: "practitioners",
      recordId: id,
      snapshot: { before: { status: p.status }, after: { status: nextStatus } },
    });
  }

  return NextResponse.json({ ok: true, status: nextStatus }, { status: 200 });
}
