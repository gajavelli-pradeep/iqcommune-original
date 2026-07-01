import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type RequestUpdate = Database["public"]["Tables"]["session_requests"]["Update"];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("session_requests")
    .select("*, assigned_practitioner:practitioners(name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Session requests GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

const CreateSchema = z.object({
  name:            z.string().min(1),
  email:           z.string().email(),
  phone:           z.string().optional(),
  org:             z.string().optional(),
  city:            z.string().optional(),
  state:           z.string().optional(),
  topic:           z.string().min(1),
  audienceType:    z.string().min(1),
  groupSize:       z.string().optional(),
  minCommit:       z.number().int().optional(),
  venue:           z.string().optional(),
  preferredDates:  z.string().optional(),
  notes:           z.string().optional(),
  status:          z.enum(["New", "Matched", "Confirmed", "Completed", "Cancelled"]).default("New"),
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const d = body.data;
  const { data, error } = await createAdminClient()
    .from("session_requests")
    .insert({
      name:             d.name,
      email:            d.email,
      phone:            d.phone ?? null,
      org:              d.org ?? null,
      city:             d.city ?? null,
      state:            d.state ?? null,
      topic:            d.topic,
      audience_type:    d.audienceType,
      group_size:       d.groupSize ?? null,
      min_commit:       d.minCommit ?? null,
      venue:            d.venue ?? null,
      preferred_dates:  d.preferredDates ?? null,
      notes:            d.notes ?? null,
      // Admin-created on behalf of a client — SPOC declaration recorded as accepted.
      spoc_declaration: true,
      status:           d.status,
    })
    .select("*, assigned_practitioner:practitioners(name)")
    .single();

  if (error) {
    log.error("Admin session request POST failed", { error: error.message });
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

const PatchSchema = z.object({
  status: z.enum(["New", "Matched", "Confirmed", "Completed", "Cancelled"]).optional(),
  // Match any RFC-4122 UUID, not just v4 — Postgres `uuid` columns accept any variant,
  // and Zod v4's `.uuid()` rejects valid non-v4 ids (e.g. seeded data), 400-ing assignment.
  assignedTo: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "invalid uuid")
    .optional(),
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data: updated, error } = await createAdminClient()
    .from("session_requests")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    log.error("Session request PATCH failed", { error: error.message, requestId: id });
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Session request not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
