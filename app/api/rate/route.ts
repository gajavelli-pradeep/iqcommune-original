import { NextRequest, NextResponse } from "next/server";
import { RatingSubmitSchema } from "@/lib/schemas/rating";
import { verifyRatingToken } from "@/lib/hmac";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";

// Rating payloads are tiny (a number + a short comment) — a small cap is plenty.
const MAX_BODY_BYTES = 20_000;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(ip);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(reset) } });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RatingSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { ref, token, rating, comments } = parsed.data;

  if (!verifyRatingToken(ref, token)) {
    return NextResponse.json({ error: "Invalid or tampered link" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // The session ref_code is the source of truth. Scope the lookup to it (a valid
  // token only unlocks this one session) and require a completed session with a
  // practitioner assigned.
  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, practitioner_id, status")
    .eq("ref_code", ref)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !session) {
    return NextResponse.json({ error: "Invalid session reference" }, { status: 403 });
  }
  if (session.status !== "Completed") {
    return NextResponse.json({ error: "This session isn't ready for a rating yet." }, { status: 409 });
  }
  if (!session.practitioner_id) {
    return NextResponse.json({ error: "This session has no assigned practitioner." }, { status: 409 });
  }

  // One rating per session (session_feedback.session_id is UNIQUE). The DB trigger
  // recalc_practitioner_rating() rolls this into practitioners.avg_rating.
  const { data: created, error: insertErr } = await supabase
    .from("session_feedback")
    .insert({
      session_id:      session.id,
      practitioner_id: session.practitioner_id,
      overall_rating:  rating,
      comments:        comments ?? null,
      collected_by:    "Requestor (via link)",
    })
    .select("id, overall_rating")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "A rating has already been submitted for this session." }, { status: 409 });
    }
    log.error("Rating submit failed", { error: insertErr.message, ref });
    return NextResponse.json({ error: "Failed to record rating" }, { status: 500 });
  }

  log.info("Practitioner rating recorded via link", { ref, feedbackId: created.id });
  return NextResponse.json({ ok: true, refCode: ref, rating: created.overall_rating });
}
