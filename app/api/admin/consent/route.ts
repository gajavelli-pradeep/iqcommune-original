import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { GenerateConsentSchema } from "@/lib/schemas/consent";
import { generateConfirmationForSession } from "@/lib/consent-generate";
import { getBaseUrl } from "@/lib/base-url";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("confirmations")
    .select("*, practitioner:practitioners(name, email)")
    .is("deleted_at", null)
    .order("issued_on", { ascending: false });

  if (error) {
    log.error("Confirmations GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load confirmations" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GenerateConsentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // The snapshot/PDF/link/email logic is shared with the reassignment flow — see
  // lib/consent-generate.ts. This route is the admin "Generate consent" entry point.
  const actor = await getAdminUser();
  const result = await generateConfirmationForSession({
    ...parsed.data,
    baseUrl: getBaseUrl(req),
    actor,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { data: { id: result.id, ref_code: result.ref_code, consent_link: result.consent_link, net: result.net, emailStatus: result.emailStatus } },
    { status: 201 }
  );
}
