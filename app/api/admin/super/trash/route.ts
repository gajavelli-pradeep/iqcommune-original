import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/supabase/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logSuperAdminAction } from "@/lib/super-admin-audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

// The soft-deletable core tables + how to label a row in the trash list.
const TABLES = ["practitioners", "sessions", "session_requests", "payouts", "agreements"] as const;
type TrashTable = (typeof TABLES)[number];

const LABELS: Record<TrashTable, { select: string; label: (r: Record<string, unknown>) => string; sublabel: (r: Record<string, unknown>) => string; kind: string }> = {
  practitioners:    { select: "id, name, ref_code, deleted_at",       kind: "Practitioner", label: (r) => String(r.name ?? "—"),        sublabel: (r) => (r.ref_code ? `IQC-${r.ref_code}` : "") },
  sessions:         { select: "id, ref_code, module, deleted_at",     kind: "Session",      label: (r) => String(r.ref_code ?? "—"),    sublabel: (r) => String(r.module ?? "") },
  session_requests: { select: "id, name, topic, deleted_at",          kind: "Request",      label: (r) => String(r.name ?? "—"),        sublabel: (r) => String(r.topic ?? "") },
  payouts:          { select: "id, invoice_ref, gross_amount, deleted_at", kind: "Payout",  label: (r) => String(r.invoice_ref ?? "—"), sublabel: (r) => (r.gross_amount != null ? `₹${Number(r.gross_amount).toLocaleString("en-IN")}` : "") },
  agreements:       { select: "id, ref_code, module, deleted_at",     kind: "Agreement",    label: (r) => String(r.ref_code ?? "—"),    sublabel: (r) => String(r.module ?? "") },
};

async function actorEmail(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? "unknown";
}

// GET — list every soft-deleted row across the core tables, newest first.
export async function GET() {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const db = createAdminClient();
  const results = await Promise.all(
    TABLES.map((t) =>
      db.from(t).select(LABELS[t].select).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(200)
    )
  );

  const items = TABLES.flatMap((t, i) => {
    const cfg = LABELS[t];
    return ((results[i].data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      table:      t,
      kind:       cfg.kind,
      id:         String(r.id),
      label:      cfg.label(r),
      sublabel:   cfg.sublabel(r),
      deleted_at: r.deleted_at as string,
    }));
  }).sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));

  return NextResponse.json({ items });
}

const ActionSchema = z.object({
  table: z.enum(TABLES),
  id:    z.string().uuid(),
});

// POST — restore a row (clear deleted_at).
export async function POST(req: NextRequest) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = ActionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Validation failed", details: body.error.flatten() }, { status: 400 });
  }
  const { table, id } = body.data;

  const db = createAdminClient();
  const { data, error } = await db.from(table).update({ deleted_at: null }).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logSuperAdminAction({ actorEmail: await actorEmail(), action: `restore_${table}`, recordTable: table, recordId: id });
  return NextResponse.json({ success: true });
}

// DELETE — purge a single row immediately (skip the grace window). FK violations
// (e.g. a practitioner that still has sessions) surface as a 409.
export async function DELETE(req: NextRequest) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const body = ActionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Validation failed", details: body.error.flatten() }, { status: 400 });
  }
  const { table, id } = body.data;

  const db = createAdminClient();
  const { data: record } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logSuperAdminAction({
    actorEmail: await actorEmail(),
    action: `purge_${table}`,
    recordTable: table,
    recordId: id,
    snapshot: record as Record<string, unknown>,
  });

  const { error } = await db.from(table).delete().eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation — row still referenced by other records.
    const isFk = error.code === "23503";
    return NextResponse.json(
      { error: isFk ? "Still referenced by other records — restore and remove those first." : error.message },
      { status: isFk ? 409 : 500 }
    );
  }
  return NextResponse.json({ success: true });
}
