import { NextRequest, NextResponse } from "next/server";
import { SessionRequestSchema } from "@/lib/schemas/session-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/database.types";

type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip, { max: 10, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("session_requests")
    .insert({
      name: d.name,
      org: d.org,
      email: d.email,
      phone: d.phone ?? null,
      topic: d.topic,
      audience_type: d.audienceType,
      group_size: d.groupSize,
      min_commit: d.minCommit,
      venue: d.venue ?? null,
      preferred_dates: d.preferredDates,
      status: "New",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[POST /api/session-requests]", error.message);
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }

  const row = data as RequestRow;
  return NextResponse.json({ id: row.id }, { status: 201 });
}
