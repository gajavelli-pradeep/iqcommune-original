import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let payment_method = "UPI";
  try {
    const body = await req.json();
    if (typeof body?.payment_method === "string" && body.payment_method) {
      payment_method = body.payment_method;
    }
  } catch {
    // no body — default to UPI
  }

  const { error } = await createAdminClient()
    .from("payouts")
    .update({ status: "Paid", paid_at: new Date().toISOString(), payment_method })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
