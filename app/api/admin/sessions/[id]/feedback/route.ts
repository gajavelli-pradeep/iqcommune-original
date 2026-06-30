import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FeedbackBody = z.object({
  overall_rating: z.number().min(1).max(5).nullable().optional(),
  subsections: z
    .record(z.string(), z.number().min(1).max(5))
    .nullable()
    .optional(),
  comments: z.string().max(2000).nullable().optional(),
  collected_by: z.string().max(200).nullable().optional(),
});

// GET — fetch existing feedback for a session (returns { feedback: {...} | null })
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: sessionId } = await params;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_feedback")
    .select("id, overall_rating, subsections, comments, collected_by, collected_at, updated_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    log.error("Feedback GET failed", { error: error.message, sessionId });
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }

  return NextResponse.json({ feedback: data ?? null });
}

// POST — create feedback (session must not already have one)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: sessionId } = await params;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Resolve practitioner_id from the session row
  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .select("practitioner_id, status")
    .eq("id", sessionId)
    .single();

  if (sessErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "Completed") {
    return NextResponse.json({ error: "Feedback can only be added to Completed sessions" }, { status: 409 });
  }
  if (!session.practitioner_id) {
    return NextResponse.json({ error: "Session has no assigned practitioner" }, { status: 422 });
  }

  const { data: created, error: insertErr } = await supabase
    .from("session_feedback")
    .insert({
      session_id:      sessionId,
      practitioner_id: session.practitioner_id,
      overall_rating:  parsed.data.overall_rating ?? null,
      subsections:     parsed.data.subsections ?? null,
      comments:        parsed.data.comments ?? null,
      collected_by:    parsed.data.collected_by ?? null,
    })
    .select("id, overall_rating")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Feedback already exists for this session — use PATCH to update" }, { status: 409 });
    }
    log.error("Feedback POST failed", { error: insertErr.message, sessionId });
    return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
  }

  log.info("Session feedback created", { sessionId, feedbackId: created.id });
  return NextResponse.json(created, { status: 201 });
}

// PATCH — update existing feedback
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id: sessionId } = await params;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 422 });
  }

  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("session_feedback")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (fetchErr) {
    log.error("Feedback PATCH fetch failed", { error: fetchErr.message, sessionId });
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "No feedback found for this session — use POST to create" }, { status: 404 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("session_feedback")
    .update({
      overall_rating: parsed.data.overall_rating ?? null,
      subsections:    parsed.data.subsections ?? null,
      comments:       parsed.data.comments ?? null,
      collected_by:   parsed.data.collected_by ?? null,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("id, overall_rating")
    .single();

  if (updateErr) {
    log.error("Feedback PATCH update failed", { error: updateErr.message, feedbackId: existing.id });
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }

  log.info("Session feedback updated", { sessionId, feedbackId: existing.id });
  return NextResponse.json(updated);
}
