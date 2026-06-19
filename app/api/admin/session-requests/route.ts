import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type RequestUpdate = Database["public"]["Tables"]["session_requests"]["Update"];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("session_requests")
    .select("*, assigned_practitioner:practitioners(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

const PatchSchema = z.object({
  status: z.enum(["New", "Matched", "Confirmed", "Completed", "Cancelled"]).optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = PatchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const update: RequestUpdate = {};
  if (body.data.status) update.status = body.data.status;
  if (body.data.assignedTo) update.assigned_to = body.data.assignedTo;

  const { error } = await createAdminClient()
    .from("session_requests")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
