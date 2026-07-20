"use client";

import { useState } from "react";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { useSendWithUndo } from "@/components/admin/useSendWithUndo";
import { sendMessageRequest } from "@/lib/admin/send-message";
import { photoGuideEmailBody, photoGuideWaBody } from "@/lib/photo-guide";

interface GuideSession {
  id: string;
  ref_code: string;
  module: string;
  status: string;
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

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          style={btnStyle}
          onClick={() => window.open("/api/admin/photo-guide", "_blank", "noopener,noreferrer")}
        >
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
      </div>

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
