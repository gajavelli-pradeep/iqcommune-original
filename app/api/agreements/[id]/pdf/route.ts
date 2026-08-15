import { getConsoleSession } from "@/features/console/requireRole";
import { log, newTraceId } from "@/lib/logger";
import { renderSignedAgreement } from "@/lib/pdf/agreement";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSignedAgreement, readArchivedAgreement } from "@/services/agreement-archive";
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
 *
 * Serves the archived bytes when there are any. That is the whole point: the
 * document a practitioner signed is a fixed artefact, and re-rendering it from
 * today's clause text would hand back a contract they never agreed to. Only two
 * kinds of row have no archive — an unsigned agreement, which has nothing to
 * archive yet, and one signed before `signed_pdf_path` existed. Both fall back
 * to rendering, and the unsigned one says so on its face.
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
    .select("reference, signed_at, signed_pdf_path")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error(traceId, "agreement pdf read failed", { message: error.message });
    return new Response("Could not read that agreement.", { status: 500 });
  }
  if (!data) return new Response("No such agreement.", { status: 404 });

  const archivePath = data.signed_pdf_path as string | null;
  const archived = archivePath ? await readArchivedAgreement(archivePath) : null;
  if (archivePath && !archived) {
    // The row claims an archive that storage will not give back. Rendering a
    // replacement here would quietly answer a request for the executed document
    // with a different one, which is exactly what the archive exists to prevent.
    log.error(traceId, "agreement archive missing from storage", { id, archivePath });
    return new Response("The signed copy of that agreement could not be retrieved.", {
      status: 500,
    });
  }

  let pdf = archived;
  if (!pdf) {
    const agreement = await buildSignedAgreement(id);
    if (!agreement) return new Response("No such agreement.", { status: 404 });
    pdf = await renderSignedAgreement(agreement);
  }

  // Best-effort: a failure to log must never withhold the document.
  void recordActivity({
    actorEmail: actor,
    action: "agreement.downloaded",
    entityType: "agreement",
    entityRef: id,
    detail: archived
      ? "Signed copy, as archived at signature."
      : data.signed_at
        ? "Signed copy — re-rendered, no archive on this row."
        : "Unsigned copy — no signature recorded.",
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
