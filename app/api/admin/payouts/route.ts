import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { z } from "zod";

const VALID_STATUSES = ["Pending", "Paid"] as const;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const status = new URL(req.url).searchParams.get("status");
  const supabase = createAdminClient();

  let query = supabase
    .from("payouts")
    .select("*, session:sessions(ref_code, module), practitioner:practitioners(name)")
    .order("created_at", { ascending: false });

  if (status && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    log.error("Payouts GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

const CreatePayoutSchema = z.object({
  sessionId:     z.string().uuid(),
  practitionerId: z.string().uuid(),
  invoiceRef:    z.string().min(1),
  grossAmount:   z.number().int().min(1),
  netAmount:     z.number().int().min(0),
  tdsRate:       z.number().min(0).max(100).optional(),
  paymentMethod: z.string().optional(),
  status:        z.enum(["Pending", "Paid"]).default("Pending"),
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = CreatePayoutSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const d = body.data;
  const { data, error } = await createAdminClient()
    .from("payouts")
    .insert({
      session_id:      d.sessionId,
      practitioner_id: d.practitionerId,
      invoice_ref:     d.invoiceRef,
      gross_amount:    d.grossAmount,
      net_amount:      d.netAmount,
      tds_rate:        d.tdsRate ?? null,
      payment_method:  d.paymentMethod ?? null,
      status:          d.status,
    })
    .select("*")
    .single();

  if (error) {
    log.error("Payout POST failed", { error: error.message });
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
