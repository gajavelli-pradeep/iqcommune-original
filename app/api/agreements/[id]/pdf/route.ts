import { renderSignedAgreement } from "@/lib/pdf/agreement";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConsoleSession } from "@/features/console/requireRole";
import { recordActivity } from "@/services/console";

/**
 * Downloads one empanelment agreement as a PDF (V7's "Download Signed
 * Agreement").
 *
 * Behind the console session rather than a capability: the spec's Download
 * button carries no `role-edit` class and the User role is described as "view &
 * download only", so every console role may take a copy. Reading it is still
 * logged — a download of a signed contract is an access event worth having in
 * the trail.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = newTraceId();
  // Redirects to /login when there is no session, so an unauthenticated request
  // never reaches the document.
  const { email: actor } = await getConsoleSession();
  const { id } = await params;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .select(
      "reference, issued_on, version, signed_at, signed_name, signed_designation, signature_mode, signed_ip, practitioners ( full_name )",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error(traceId, "agreement pdf read failed", { message: error.message });
    return new Response("Could not read that agreement.", { status: 500 });
  }
  if (!data) return new Response("No such agreement.", { status: 404 });

  const practitioner = Array.isArray(data.practitioners) ? data.practitioners[0] : data.practitioners;
  const name = (practitioner?.full_name as string | undefined) ?? "Practitioner";

  const dateOnly = (value: string | null) =>
    value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : null;

  const pdf = await renderSignedAgreement({
    reference: data.reference,
    practitioner: name,
    issuedOn: dateOnly(data.issued_on) ?? "—",
    signedName: data.signed_name,
    signedDesignation: data.signed_designation,
    signedAt: data.signed_at
      ? new Date(data.signed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })
      : null,
    signatureMode: data.signature_mode === "drawn" ? "Drawn" : data.signature_mode === "typed" ? "Typed" : null,
    signedIp: data.signed_ip,
    version: data.version,
  });

  // Best-effort: a failure to log must never withhold the document.
  void recordActivity({
    actorEmail: actor,
    action: "agreement.downloaded",
    entityType: "agreement",
    entityRef: id,
    detail: data.signed_at ? "Signed copy." : "Unsigned copy — no signature recorded.",
  });

  // The filename is what the practitioner's own records will show, so it
  // carries the reference rather than a uuid.
  const filename = `${data.reference}-empanelment-agreement.pdf`;

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // A signed contract must not sit in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
