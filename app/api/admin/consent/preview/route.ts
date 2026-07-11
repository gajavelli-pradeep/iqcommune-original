import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { getConsentAutofill } from "@/lib/consent-generate";

export const dynamic = "force-dynamic";

// Read-only preview of the fields the consent form auto-populates for a session —
// backs the "Auto-populated" review block in the Generate-confirmation modal.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const result = await getConsentAutofill(sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ data: result.data });
}
