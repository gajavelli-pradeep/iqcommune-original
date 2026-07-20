"use client";

import { useState } from "react";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { useSendWithUndo } from "@/components/admin/useSendWithUndo";
import { sendMessageRequest } from "@/lib/admin/send-message";
import { photoGuideEmailBody, photoGuideWaBody, PHOTO_SHOT_LIST } from "@/lib/photo-guide";

interface GuideSession {
  id: string;
  ref_code: string;
  module: string;
  status: string;
  // Shown in the selected-session reference panel.
  session_date?: string | null;
  venue?: string | null;
  practitioner: { name: string; email: string } | null;
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid rgba(15,17,23,.10)",
  borderRadius: 10,
  padding: "1.25rem 1.5rem",
  marginTop: "1.25rem",
};
const btnStyle: React.CSSProperties = {
  background: "#f8f7f4",
  border: "1px solid rgba(15,17,23,.15)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  color: "var(--ink)",
};

// Op-procedure Part 4 steps 22-24: the Consent tab's photo-guide sub-section —
// pick an upcoming session, download the guide, draft the heads-up email. The guide
// is sent BEFORE the session, so it lists upcoming (not completed) sessions.
export function PhotoGuideSection({ sessions }: { sessions: GuideSession[] }) {
  const eligible = sessions.filter((s) => s.status === "Upcoming");
  const [sessionId, setSessionId] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState("");
  const sendUndo = useSendWithUndo();

  const selected = eligible.find((s) => s.id === sessionId) ?? null;
  const name = selected?.practitioner?.name ?? "";
  const email = selected?.practitioner?.email ?? "";

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
        Send the photo guide
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12, lineHeight: 1.5 }}>
        Only sessions marked Confirmed above show up here — this is the moment to tell the practitioner what shots to capture, before the session happens.
      </div>

      <label>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
          Select Confirmed session
        </span>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          style={{ width: "100%", maxWidth: 460, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)", background: "var(--input-paper)", fontFamily: "inherit", fontSize: 13, color: "var(--ink)" }}
        >
          <option value="">{eligible.length ? "— select session —" : "No upcoming sessions"}</option>
          {eligible.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ref_code} · {s.module}{s.practitioner ? ` · ${s.practitioner.name}` : ""}
            </option>
          ))}
        </select>
      </label>

      {/* Selected-session reference panel (mockup `pg-picker-info`) — the details you
          need in front of you while messaging the practitioner. */}
      {selected && (
        <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "12px 14px", marginTop: 14, fontSize: 12.5 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
            {([
              ["Practitioner", name || "—"],
              ["Module", selected.module],
              ["Session date", selected.session_date ? new Date(selected.session_date).toLocaleDateString("en-IN") : "—"],
              ["Venue", selected.venue || "—"],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <div style={{ color: "var(--ink-faint)", fontSize: 10.5 }}>{label}</div>
                <div style={{ fontWeight: 500, color: "var(--ink)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {/* Mockup makes the download the dark primary of this pair. */}
        <button
          type="button"
          style={{ ...btnStyle, background: "var(--ink)", color: "#fff", border: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => window.open("/api/admin/photo-guide", "_blank", "noopener,noreferrer")}
        >
          <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Download photo guide (PDF)
        </button>
        <button
          type="button"
          style={{ ...btnStyle, opacity: selected ? 1 : 0.5, cursor: selected ? "pointer" : "not-allowed" }}
          disabled={!selected}
          onClick={() => setDraftOpen(true)}
        >
          Send photo guide email
        </button>
        <button
          type="button"
          style={{ ...btnStyle, opacity: selected ? 1 : 0.5, cursor: selected ? "pointer" : "not-allowed" }}
          disabled={!selected}
          onClick={() => setGuideOpen(true)}
        >
          Preview photo request guide
        </button>
      </div>

      {/* Photo request guide — the mockup's preview surface: session details for
          reference plus the shot guide, with the same two actions in its footer. */}
      {guideOpen && selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo request guide"
          onClick={() => setGuideOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: 12, width: "100%", maxWidth: 560, overflow: "hidden" }}>
            <div style={{ background: "var(--ink)", color: "#fff", padding: "0.9rem 1.25rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Photo request guide — {selected.ref_code}</div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>Session details + a shot guide to send the practitioner</div>
              </div>
              <button type="button" aria-label="Close" onClick={() => setGuideOpen(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 15, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: "1.1rem 1.25rem", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 12.5 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-faint)", fontWeight: 600, marginBottom: 8 }}>
                  Session details — for reference when you message the practitioner
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
                  {([
                    ["Practitioner", name || "—"],
                    ["Module", selected.module],
                    ["Session date", selected.session_date ? new Date(selected.session_date).toLocaleDateString("en-IN") : "—"],
                    ["Venue", selected.venue || "—"],
                  ] as const).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: "var(--ink-faint)", fontSize: 10.5 }}>{label}</div>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
                Shot guide — what to ask the practitioner to capture
              </div>
              <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: 6 }}>
                {PHOTO_SHOT_LIST.map((s) => (
                  <li key={s.title} style={{ fontSize: 12.5, color: "var(--ink)" }}>
                    <span style={{ fontWeight: 500 }}>{s.title}</span>
                    <span style={{ color: "var(--ink-muted)" }}> — {s.hint}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", padding: "0.9rem 1.25rem", borderTop: "1px solid rgba(15,17,23,.10)" }}>
              <button type="button" style={btnStyle} onClick={() => { setGuideOpen(false); setDraftOpen(true); }}>
                Draft email with guide
              </button>
              <button
                type="button"
                style={{ ...btnStyle, background: "var(--ink)", color: "#fff", border: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => window.open("/api/admin/photo-guide", "_blank", "noopener,noreferrer")}
              >
                <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download guide (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      <ContactDraftModal
        open={draftOpen}
        editable
        sendLabel="Click to send"
        onClose={() => setDraftOpen(false)}
        recipientName={name}
        recipientEmail={email}
        subject="Photo guide for your upcoming iqcommune session"
        emailBody={photoGuideEmailBody(name)}
        waBody={photoGuideWaBody(name)}
        title="Send photo-guide email"
        subtitle="Review or edit, then send — you'll get 15s to undo"
        onSend={(edited) => {
          if (!email) { setToast("No email on file for this practitioner."); setTimeout(() => setToast(""), 4000); return; }
          // Photo guide is an external (Type B) send — 15s undo window.
          sendUndo.send("delayed", `Photo guide to ${email}`, async () => {
            const r = await sendMessageRequest({ to: email, name, subject: edited.subject, body: edited.emailBody, kind: "photo-guide" });
            setToast(r.ok ? `Photo guide sent to ${r.sentTo}` : (r.error ?? "Send failed"));
            setTimeout(() => setToast(""), 4000);
          });
        }}
      />
      {sendUndo.node}
      {toast && (
        <div role="status" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", maxWidth: "calc(100vw - 2rem)", boxSizing: "border-box", background: "var(--ink)", color: "var(--surface)", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 8, boxShadow: "0 6px 20px rgba(15,17,23,.20)", zIndex: 9400 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
