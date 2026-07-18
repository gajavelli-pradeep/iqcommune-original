"use client";

import { useState } from "react";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
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
  border: "1px solid rgba(20,18,12,.10)",
  borderRadius: 10,
  padding: "1.25rem 1.5rem",
  marginTop: "1.25rem",
};
const btnStyle: React.CSSProperties = {
  background: "#f8f7f4",
  border: "1px solid rgba(20,18,12,.15)",
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

  const selected = eligible.find((s) => s.id === sessionId) ?? null;
  const name = selected?.practitioner?.name ?? "";

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
        Photo guide — send before the session
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 12, lineHeight: 1.5 }}>
        Pick an upcoming session, download the 8-shot guide, and draft the heads-up email to the practitioner.
      </div>

      <label>
        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
          Session
        </span>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          style={{ width: "100%", maxWidth: 460, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", background: "var(--input-paper)", fontFamily: "inherit", fontSize: 13, color: "var(--ink)" }}
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
          Download photo guide
        </button>
        <button
          type="button"
          style={{ ...btnStyle, opacity: selected ? 1 : 0.5, cursor: selected ? "pointer" : "not-allowed" }}
          disabled={!selected}
          onClick={() => setDraftOpen(true)}
        >
          Draft email
        </button>
      </div>

      <ContactDraftModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        recipientName={name}
        recipientEmail={selected?.practitioner?.email}
        subject="Photo guide for your upcoming iqcommune session"
        emailBody={photoGuideEmailBody(name)}
        waBody={photoGuideWaBody(name)}
        title="Draft photo-guide email"
        subtitle="Pre-filled — copy and send via your preferred channel"
      />
    </div>
  );
}
