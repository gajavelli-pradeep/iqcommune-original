import { renderConfirmation, renderPhotoGuide } from "@/lib/pdf/confirmation";
import { log, newTraceId } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConsoleSession } from "@/features/console/requireRole";
import { recordActivity } from "@/services/console";

/**
 * The two documents a session assignment produces (V7 tab 4):
 *   ?doc=confirmation (default) — the confirmation and payout consent record.
 *   ?doc=photo-guide            — the pre-session shot list.
 *
 * One route because they are one record seen two ways, and because both need
 * the identical join. Behind the console session, not a capability: V7 gives
 * the Download buttons to every role and the User role is "view & download
 * only".
 */

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "To be confirmed";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = newTraceId();
  const { email: actor } = await getConsoleSession();
  const { id } = await params;

  const wanted = new URL(request.url).searchParams.get("doc") ?? "confirmation";
  if (wanted !== "confirmation" && wanted !== "photo-guide") {
    return new Response("Unknown document.", { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select(
      "confirmation_reference, gross_payout, currency, consent_given_at, practitioners ( full_name ), sessions ( reference, module, session_date, start_time, duration_minutes, city, state, venue, participants, spoc_name, audience )",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error(traceId, "confirmation pdf read failed", { message: error.message });
    return new Response("Could not read that session.", { status: 500 });
  }
  if (!data) return new Response("No such session.", { status: 404 });

  const practitioner = Array.isArray(data.practitioners) ? data.practitioners[0] : data.practitioners;
  const session = Array.isArray(data.sessions) ? data.sessions[0] : data.sessions;
  if (!session) return new Response("That assignment has no session.", { status: 404 });

  const name = (practitioner?.full_name as string | undefined) ?? "Practitioner";

  let pdf: Uint8Array;
  try {
    pdf =
    wanted === "photo-guide"
      ? await renderPhotoGuide({
          sessionReference: session.reference,
          practitioner: name,
          module: session.module,
          sessionDate: day(session.session_date),
          city: session.city,
          venue: session.venue,
        })
      : await renderConfirmation({
          confirmationReference: data.confirmation_reference,
          sessionReference: session.reference,
          practitioner: name,
          module: session.module,
          sessionDate: day(session.session_date),
          startTime: session.start_time ? (session.start_time as string).slice(0, 5) : null,
          durationMinutes: session.duration_minutes,
          city: session.city,
          state: session.state,
          venue: session.venue,
          participants: session.participants,
          spoc: session.spoc_name,
          audience: session.audience,
          grossPayout: money(data.gross_payout, data.currency),
          consentGivenAt: data.consent_given_at
            ? new Date(data.consent_given_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "medium",
              })
            : null,
        });
  } catch (cause) {
    // A rendering failure is a bug in the document, not in the request, and the
    // message is the only thing that identifies which field caused it.
    const message = cause instanceof Error ? cause.message : String(cause);
    log.error(traceId, "pdf render failed", { document: wanted, message });
    return new Response(
      process.env.NODE_ENV === "development" ? `PDF render failed: ${message}` : "Could not build that document.",
      { status: 500 },
    );
  }

  void recordActivity({
    actorEmail: actor,
    action: wanted === "photo-guide" ? "photo_guide.downloaded" : "confirmation.downloaded",
    entityType: "assignment",
    entityRef: id,
  });

  const filename =
    wanted === "photo-guide"
      ? `${session.reference}-photo-guide.pdf`
      : `${data.confirmation_reference}-confirmation.pdf`;

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
