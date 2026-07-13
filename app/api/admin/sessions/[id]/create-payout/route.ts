import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayoutForSession } from "@/lib/admin/create-payout";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const actor = await getAdminUser();
  const result = await createPayoutForSession(createAdminClient(), id, actor ?? undefined);

  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : result.code === "not_completed" ? 409 : 500;
    return NextResponse.json({ error: result.message }, { status });
  }
  if (!result.created) {
    return NextResponse.json({ error: "Payout already exists for this session" }, { status: 409 });
  }
  return NextResponse.json({ data: result.payout }, { status: 201 });
}
