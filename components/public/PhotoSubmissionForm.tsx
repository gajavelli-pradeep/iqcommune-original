"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useCallback } from "react";

const SHOT_LIST = [
  { title: "Back of room — trainer in focus",         hint: "Full audience visible in background" },
  { title: "From trainer's position",                  hint: "Audience facing the screen" },
  { title: "Front-left corner",                        hint: "Wide view of the full room" },
  { title: "Front-right corner",                       hint: "Trainer and session materials visible" },
  { title: "Candid — working through numbers",         hint: "Participant engaged with content" },
  { title: "Candid — Q&A or discussion moment",        hint: "Natural interaction" },
  { title: "Candid — notes or worksheet close-up",     hint: "In-session working material" },
  { title: "Group photo",                              hint: "Trainer and all participants" },
] as const;

export function PhotoSubmissionForm() {
  const params     = useSearchParams();
  const ref        = params.get("ref")     ?? "";
  const session    = params.get("session") ?? "";
  const sessionModule = params.get("module")  ?? "";
  const date       = params.get("date")    ?? "";
  const city       = params.get("city")    ?? "";
  const state      = params.get("state")   ?? "";
  const name       = params.get("name")    ?? "";
  const role       = params.get("role")    ?? "";
  const org        = params.get("org")     ?? "";
  const sig        = params.get("sig")     ?? "";

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const [checkedShots, setCheckedShots] = useState<Set<number>>(new Set());
  const [files, setFiles]               = useState<File[]>([]);
  const [consent, setConsent]           = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<{
    submissionId: string;
    photoCount: number;
    expiryDate: string;
    submittedAt: string;
  } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const toggleShot = useCallback((i: number) => {
    setCheckedShots((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const allowed = Array.from(incoming).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    setFiles((prev) => {
      const combined = [...prev, ...allowed].slice(0, 10);
      return combined;
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { setError("Please select at least one photo."); return; }
    if (!consent) { setError("Please confirm participant consent before submitting."); return; }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("ref",        ref);
    fd.append("sessionId",  session);
    fd.append("module",     sessionModule);
    fd.append("city",       city);
    fd.append("state",      state);
    if (org) fd.append("org", org);
    fd.append("participantConsent", "true");
    fd.append("linkSig",   sig);
    fd.append("linkParams", JSON.stringify({ ref, session, module: sessionModule, date, city, state, name, role, org: org || undefined }));
    for (const f of files) fd.append("photos", f);

    try {
      const res  = await fetch("/api/photo-submissions", { method: "POST", body: fd });
      const body = await res.json() as { submissionId?: string; photoCount?: number; expiryDate?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Submission failed. Please try again.");
        return;
      }
      setSuccess({
        submissionId: body.submissionId ?? "",
        photoCount:   body.photoCount ?? files.length,
        expiryDate:   body.expiryDate ?? "",
        submittedAt:  new Date().toLocaleString("en-IN"),
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        style={{
          maxWidth: 860,
          margin: "2.5rem auto",
          padding: "0 2rem 4rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(20,18,12,.10)",
            borderRadius: 12,
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          {/* Checkmark circle */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#e9f5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <svg width={36} height={36} fill="none" stroke="#2a6b2a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
            Photos received. Thank you.
          </h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.6, margin: "0 auto 2rem", maxWidth: 480 }}>
            We&apos;ll review and process them within 30 days. Confirmed photos will appear on the iqcommune sessions gallery. If you included an organisation name, we&apos;ll confirm with you before any public tagging.
          </p>

          {/* Receipt box */}
          <div
            style={{
              background: "var(--surface-soft)",
              border: "1px solid rgba(20,18,12,.10)",
              borderRadius: 8,
              padding: "1.25rem 1.5rem",
              textAlign: "left",
            }}
          >
            <ReceiptRow label="Submitted by"      value={name} />
            <ReceiptRow label="Practitioner ref."  value={`IQC-EMP-${ref}`} mono />
            <ReceiptRow label="Session"            value={[session, sessionModule, city].filter(Boolean).join(" · ")} />
            <ReceiptRow label="Submitted at"       value={success.submittedAt} green />
            {success.expiryDate && (
              <ReceiptRow label="Storage expiry"   value={new Date(success.expiryDate).toLocaleDateString("en-IN")} />
            )}
            <ReceiptRow label="Status" value="✓ Received — pending review" green />
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "center", maxWidth: 480, margin: "1rem auto 0", lineHeight: 1.55 }}>
            Photos are stored for 30 days from the submission timestamp above. Unprocessed photos are deleted automatically at expiry — no action needed from you.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 860, margin: "0 auto", padding: "0 1.25rem 4rem" }}>

      {/* ── Card header ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(20,18,12,.10)",
          borderRadius: 12,
          padding: "2rem",
          marginBottom: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: "none",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", marginBottom: "0.4rem", letterSpacing: "-0.01em" }}>
          Submit your session photos
        </h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
          Eight standard angles — all on your phone. Once submitted, your photos sit in our review queue. We&apos;ll process and publish the confirmed ones; anything not selected is automatically deleted after 30 days.
        </p>
      </div>

      {/* Card body */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(20,18,12,.10)",
          borderRadius: 12,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          padding: "1.5rem 2rem 2rem",
          marginBottom: 0,
        }}
      >

      {/* ── Practitioner strip ── */}
      <div
        style={{
          background: "var(--surface-soft)",
          border: "1px solid rgba(20,18,12,.10)",
          borderRadius: 8,
          padding: "0.85rem 1rem",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 1 }}>
            {[role, org, city].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#8a6510",
            background: "var(--gold-light)",
            border: "1px solid var(--gold-border)",
            borderRadius: 100,
            padding: "3px 10px",
            flexShrink: 0,
          }}
        >
          Ref: IQC-EMP-{ref}
        </span>
      </div>

      {/* ── Session band ── */}
      <div
        style={{
          background: "var(--surface-soft)",
          border: "1px solid rgba(20,18,12,.10)",
          borderRadius: 8,
          padding: "0.85rem 1rem",
          marginBottom: 24,
          display: "grid",
          // auto-fit collapses 4→2→1 columns as the card narrows, so the date /
          // module / city / session-ID values never overflow at 320px (was a fixed
          // repeat(4,1fr) that crushed each cell to ~55px on a phone).
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "1rem",
        }}
      >
        <SessionField label="Session date" value={formattedDate} />
        <SessionField label="Module"       value={sessionModule} />
        <SessionField label="City"         value={city} sub={state} />
        <SessionField label="Session ID"   value={session} mono />
      </div>

      {/* ── Storage notice ── */}
      <div
        style={{
          background: "#f5e9c8",
          borderLeft: "3px solid var(--gold)",
          borderRadius: "0 8px 8px 0",
          padding: "0.85rem 1rem",
          marginBottom: 24,
          fontSize: 13,
          color: "#8a6510",
          lineHeight: 1.6,
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
        }}
      >
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>
          <strong>Storage policy:</strong> All photos are stored securely for 30 days from the date of submission. Anything not approved for publication within that window is automatically deleted — we do not retain unprocessed photos beyond 30 days. No action needed from you after submission.
        </span>
      </div>

      {/* ── Shot checklist ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.10em", color: "var(--ink-faint)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Shot checklist — tick what you captured
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "7px" }}>
          {SHOT_LIST.map((shot, i) => {
            const checked = checkedShots.has(i);
            return (
              <label
                key={i}
                style={{
                  background: checked ? "#e9f5e9" : "var(--surface-soft)",
                  border: checked ? "1.5px solid var(--green-border)" : "1.5px solid rgba(20,18,12,0.12)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  cursor: "pointer",
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  userSelect: "none",
                  transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleShot(i)}
                  style={{ accentColor: "var(--green)", marginTop: 2, flexShrink: 0, width: 14, height: 14 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: checked ? 500 : 400, color: checked ? "var(--green)" : "var(--ink-soft)", lineHeight: 1.3 }}>
                    {shot.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 1 }}>
                    {shot.hint}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Upload area ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Drop zone */}
        <div
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          style={{
            border: `1.5px dashed ${dragOver ? "var(--gold)" : "rgba(201,152,42,0.4)"}`,
            borderRadius: 8,
            padding: "2rem 1rem",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "var(--gold-light)" : "var(--surface-soft)",
            transition: "border-color 0.12s, background 0.12s",
          }}
        >
          <svg width={32} height={32} fill="none" stroke="var(--gold-dark)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ margin: "0 auto 0.75rem", display: "block" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
            Tap to upload photos
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>
            JPEG or PNG · Up to 10 photos · Max 25MB per photo
          </div>
        </div>

        {/* File count below drop zone */}
        {files.length > 0 && (
          <div style={{ marginTop: "0.5rem", fontSize: 13, color: "#2a6b2a", fontWeight: 500 }}>
            {files.length} photo{files.length > 1 ? "s" : ""} selected
          </div>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* File list */}
        {files.length > 0 && (
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: 4 }}>
            {files.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 8px",
                  background: "var(--surface-soft)",
                  borderRadius: 6,
                }}
              >
                <svg width={12} height={12} fill="none" stroke="var(--ink-faint)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ flex: 1, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
                <span style={{ color: "var(--ink-faint)", flexShrink: 0 }}>
                  {(f.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-faint)",
                    padding: "2px 4px",
                    fontSize: 14,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Consent ── */}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            background: "var(--surface-soft)",
            border: "1.5px solid rgba(20,18,12,0.12)",
            borderRadius: 8,
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ marginTop: 2, flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }}
            />
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            All session participants were informed that photos would be taken and may appear on iqcommune&apos;s website and social media. I confirm participant consent on their behalf, and take responsibility for any tagging or attribution requests related to these photos.
          </span>
        </label>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid var(--red-border)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          width: "100%",
          background: submitting ? "rgba(20,22,29,0.5)" : "var(--ink)",
          color: "#fff",
          border: "none",
          borderRadius: 100,
          padding: "15px",
          fontSize: 15,
          fontWeight: 600,
          cursor: submitting ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {submitting ? (
          "Uploading…"
        ) : (
          <>
            <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Submit photos for review
          </>
        )}
      </button>

      <p style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "center", marginTop: "0.75rem", marginBottom: 0, lineHeight: 1.5 }}>
        Nothing is published automatically. Every photo is reviewed by iqcommune before appearing anywhere.
      </p>

      </div>{/* end card body */}
    </form>
  );
}

function SessionField({ label, value, mono, sub }: { label: string; value: string; mono?: boolean; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", fontFamily: mono ? "monospace" : undefined }}>
        {value || "—"}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function ReceiptRow({ label, value, mono, green }: { label: string; value: string; mono?: boolean; green?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "4px 0", borderBottom: "1px solid rgba(20,18,12,.06)" }}>
      <span style={{ fontSize: 13, color: "var(--ink-faint)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: green ? "#2a6b2a" : "var(--ink)", fontFamily: mono ? "monospace" : undefined, textAlign: "right", fontWeight: green ? 500 : 400 }}>
        {value}
      </span>
    </div>
  );
}
