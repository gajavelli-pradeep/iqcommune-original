import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { signPhotoUrl } from "@/lib/hmac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("sessions")
    .select("ref_code, module, session_date, status, practitioner_id")
    .eq("id", id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "Completed") {
    return NextResponse.json(
      { error: "Photo links can only be generated for Completed sessions" },
      { status: 422 }
    );
  }

  const { data: practitioner, error: pErr } = await supabase
    .from("practitioners")
    .select("ref_code, name, role, city, state")
    .eq("id", session.practitioner_id)
    .single();

  if (pErr || !practitioner) {
    return NextResponse.json({ error: "Practitioner not found" }, { status: 404 });
  }

  const url = signPhotoUrl({
    ref:     practitioner.ref_code ?? "",
    session: session.ref_code ?? "",
    module:  session.module ?? "",
    date:    session.session_date ?? "",
    city:    (practitioner as unknown as Record<string, string>).city ?? "",
    state:   (practitioner as unknown as Record<string, string>).state ?? "",
    name:    practitioner.name ?? "",
    role:    practitioner.role ?? "",
  });

  return NextResponse.json({ url });
}
