import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];

const SAFE_KEYS: (keyof PractitionerRow)[] = [
  "id",
  "name",
  "email",
  "phone",
  "role",
  "org",
  "city",
  "state",
  "experience",
  "modules",
  "teach_freq",
  "why",
  "status",
  "ref_code",
  "pay_to_family",
  "created_at",
  "updated_at",
];

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { data, error } = await createAdminClient()
    .from("practitioners")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Practitioners GET failed", { error: error.message });
    return NextResponse.json({ error: "Failed to load practitioners" }, { status: 500 });
  }

  // Strip bank / payment fields from list response — full data available via /[id]
  const safe = (data as PractitionerRow[]).map((p) =>
    Object.fromEntries(SAFE_KEYS.map((k) => [k, p[k]]))
  );

  return NextResponse.json({ data: safe });
}

const STATUSES = [
  "Applied",
  "Under Review",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
  "Rejected",
] as const;

const CreatePractitionerSchema = z.object({
  name:       z.string().min(1),
  email:      z.string().email(),
  role:       z.string().min(1),
  city:       z.string().min(1),
  experience: z.string().min(1),
  phone:      z.string().optional(),
  org:        z.string().optional(),
  modules:    z.array(z.string()).default([]),
  status:     z.enum(STATUSES).default("Applied"),
});

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = CreatePractitionerSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "Validation failed", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const d = body.data;
  const { data, error } = await createAdminClient()
    .from("practitioners")
    .insert({
      name:       d.name,
      email:      d.email,
      role:       d.role,
      city:       d.city,
      experience: d.experience,
      phone:      d.phone ?? null,
      org:        d.org ?? null,
      modules:    d.modules,
      status:     d.status,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    log.error("Practitioner POST failed", { error: error.message });
    return NextResponse.json({ error: "Failed to create practitioner" }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
