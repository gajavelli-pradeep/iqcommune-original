import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin-audit";
import { log } from "@/lib/logger";

// V6 §10: the admin can upload session photos directly, as a co-equal path to the
// practitioner's link ("whichever happens first fills the record"). Mirrors the
// public /api/photo-submissions storage + photo_submissions insert, but keyed off a
// Completed session and gated by admin auth instead of an HMAC link.

const MAX_PHOTOS     = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const BUCKET         = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

function isMimeAllowed(header: Uint8Array): boolean {
  const isJpeg = header[0] === 0xff && header[1] === 0xd8;
  const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  return isJpeg || isPng;
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 422 });
  }

  const files = formData.getAll("photos").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 422 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 422 });
  }
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} exceeds the 25 MB limit` }, { status: 422 });
    }
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!isMimeAllowed(header)) {
      return NextResponse.json({ error: `${file.name} is not a valid JPEG or PNG` }, { status: 422 });
    }
  }

  const supabase = createAdminClient();

  // Resolve the session + its practitioner (photo_submissions is keyed by the
  // practitioner + session refs, exactly like the public link path).
  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .select("ref_code, module, status, practitioner_id")
    .eq("id", sessionId)
    .single();
  if (sessErr || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "Completed") {
    return NextResponse.json({ error: "Photos can only be uploaded for Completed sessions." }, { status: 422 });
  }

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("ref_code, city, state")
    .eq("id", session.practitioner_id)
    .single();
  if (!practitioner) {
    return NextResponse.json({ error: "Practitioner not found for this session" }, { status: 404 });
  }

  const sessionRef = session.ref_code ?? sessionId;
  const storageKeys: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key      = `${practitioner.ref_code}/${sessionRef}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadErr) {
      log.error("Admin photo upload failed", { key, error: uploadErr.message });
      return NextResponse.json({ error: "Failed to upload photos" }, { status: 500 });
    }
    storageKeys.push(key);
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryDateStr = expiryDate.toISOString().split("T")[0];

  const { data: submission, error: dbErr } = await supabase
    .from("photo_submissions")
    .insert({
      practitioner_ref:    practitioner.ref_code ?? "",
      session_ref:         sessionRef,
      module:              session.module,
      city:                practitioner.city ?? "",
      state:               practitioner.state ?? "",
      org:                 null,
      expiry_date:         expiryDateStr,
      photo_count:         files.length,
      storage_keys:        storageKeys,
      participant_consent: true,
      status:              "Pending",
    })
    .select("id")
    .single();

  if (dbErr || !submission) {
    log.error("Admin photo_submissions insert failed", { error: dbErr?.message });
    await supabase.storage.from(BUCKET).remove(storageKeys); // avoid orphaned files
    return NextResponse.json({ error: "Failed to record the upload" }, { status: 500 });
  }

  const actor = await getAdminUser();
  await logActivity({
    actorEmail: actor?.email ?? "unknown",
    actorRole: actor?.role ?? "admin",
    action: "admin_upload_photos",
    recordTable: "photo_submissions",
    recordId: submission.id,
    snapshot: { session_ref: sessionRef, count: files.length },
  });

  return NextResponse.json({ ok: true, id: submission.id, count: files.length });
}
