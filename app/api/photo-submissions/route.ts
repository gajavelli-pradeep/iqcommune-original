import { NextRequest, NextResponse } from "next/server";
import { PhotoSubmissionSchema } from "@/lib/schemas/photo-submission";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/ip";
import { log } from "@/lib/logger";
import { verifyPhotoLinkParams } from "@/lib/hmac";
import { sendEmail } from "@/lib/email/brevo";
import { photoReceived } from "@/lib/email/templates";
import { guardEmailSend, revokeEmailSend, recordEmailMessageId } from "@/lib/email/idempotency";

const MAX_PHOTOS         = 10;
const MAX_FILE_BYTES     = 25 * 1024 * 1024; // 25 MB
const BUCKET             = process.env.SUPABASE_PHOTOS_BUCKET ?? "session-photos";

function isMimeAllowed(header: Uint8Array): boolean {
  const isJpeg = header[0] === 0xff && header[1] === 0xd8;
  const isPng  = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  return isJpeg || isPng;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { limited, reset } = await checkRateLimit(`photo:${ip}`);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(reset) } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  // Collect string fields from FormData
  const fields: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") fields[k] = v;
  }

  const parsed = PhotoSubmissionSchema.safeParse({
    ...fields,
    participantConsent: fields.participantConsent === "true" ? true : undefined,
    linkParams: (() => {
      try { return JSON.parse(fields.linkParams ?? "{}"); }
      catch { return {}; }
    })(),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const d = parsed.data;

  // Re-verify HMAC sig on photo link params (server-side; client cannot forge)
  if (!verifyPhotoLinkParams(d.linkParams, d.linkSig)) {
    log.warn("Photo link HMAC verification failed", { ref: d.ref, session: d.sessionId });
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  // Bind every persisted field to the HMAC-verified linkParams. The top-level
  // fields are NOT covered by the signature, so trusting them would let one
  // valid link spoof another practitioner's ref / session / module.
  const lp = d.linkParams;
  if (
    d.ref !== lp.ref ||
    d.sessionId !== lp.session ||
    d.module !== lp.module ||
    d.city !== lp.city ||
    d.state !== lp.state ||
    (d.org ?? "") !== (lp.org ?? "")
  ) {
    log.warn("Photo link field/linkParams mismatch", { ref: d.ref, session: d.sessionId });
    return NextResponse.json({ error: "Invalid or tampered link" }, { status: 403 });
  }

  // Validate uploaded files
  const files = formData.getAll("photos").filter((v): v is File => v instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 422 });
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 422 });
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} exceeds the 25 MB limit` },
        { status: 422 }
      );
    }
    // Magic-byte MIME check — not spoofable via Content-Type header
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (!isMimeAllowed(header)) {
      return NextResponse.json(
        { error: `${file.name} is not a valid JPEG or PNG` },
        { status: 422 }
      );
    }
  }

  const supabase = createAdminClient();

  // Confirm practitioner is empanelled
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("ref_code, name, email, status")
    .eq("ref_code", d.ref)
    .eq("status", "Empanelled")
    .single();

  if (!practitioner) {
    return NextResponse.json({ error: "Invalid practitioner reference" }, { status: 403 });
  }

  // Upload to Supabase Storage
  const storageKeys: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key      = `${d.ref}/${d.sessionId}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadErr) {
      log.error("Photo upload failed", { key, error: uploadErr.message });
      return NextResponse.json({ error: "Failed to upload photos" }, { status: 500 });
    }
    storageKeys.push(key);
  }

  // Insert photo_submissions record
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryDateStr = expiryDate.toISOString().split("T")[0];

  const { data: submission, error: dbErr } = await supabase
    .from("photo_submissions")
    .insert({
      practitioner_ref:    d.ref,
      session_ref:         d.sessionId,
      module:              d.module,
      city:                d.city,
      state:               d.state,
      org:                 d.org ?? null,
      expiry_date:         expiryDateStr,
      photo_count:         files.length,
      storage_keys:        storageKeys,
      participant_consent: true,
      status:              "Pending",
    })
    .select("id")
    .single();

  if (dbErr || !submission) {
    log.error("photo_submissions insert failed", { error: dbErr?.message });
    // Roll back uploaded files to avoid orphans in storage.
    const { error: cleanupErr } = await supabase.storage.from(BUCKET).remove(storageKeys);
    if (cleanupErr) {
      log.error("Photo cleanup after failed insert", { error: cleanupErr.message, keys: storageKeys });
    }
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  // Send confirmation email (idempotent)
  const alreadySent = await guardEmailSend(
    "photo_received",
    submission.id as string,
    practitioner.email as string
  );
  if (!alreadySent) {
    try {
      const { subject, htmlContent } = photoReceived({
        practitionerName: practitioner.name as string,
        sessionRef:       d.sessionId,
        expiryDate:       expiryDate.toLocaleDateString("en-IN"),
      });
      const { messageId } = await sendEmail({
        to:   practitioner.email as string,
        name: practitioner.name as string,
        subject,
        htmlContent,
      });
      await recordEmailMessageId("photo_received", submission.id as string, messageId);
    } catch (emailErr) {
      log.error("Photo received email failed — revoking sentinel so it can retry", { error: String(emailErr), submissionId: submission.id });
      await revokeEmailSend("photo_received", submission.id as string);
    }
  }

  return NextResponse.json(
    { submissionId: submission.id, photoCount: files.length, expiryDate: expiryDateStr },
    { status: 201 }
  );
}
