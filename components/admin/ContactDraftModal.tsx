"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Channel = "email" | "whatsapp";

export interface ContactDraftModalProps {
  open: boolean;
  onClose: () => void;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  defaultChannel?: Channel;
  /** Pre-filled subject line */
  subject?: string;
  /** Pre-composed email body (read-only) */
  emailBody?: string;
  /** Pre-composed WhatsApp body (read-only) */
  waBody?: string;
  /** 'To' meta line displayed in the meta bar */
  toMeta?: string;
  /** 'Re' meta line displayed in the meta bar */
  reMeta?: string;
  /** Modal title, e.g. 'Draft message' */
  title?: string;
  /** Modal subtitle, e.g. 'Pre-filled · copy and send via your preferred channel' */
  subtitle?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

// Gap 29: Rebuilt to match source design:
//   - Dark header (#0f1117 bg) with white title/subtitle and white ✕ close
//   - Tab bar (Email / WhatsApp) with gold underline on active
//   - draft-meta gray bar (To / Re info)
//   - draft-subject bold line
//   - draft-text read-only pre-wrap block
//   - Footer: left note text + right Copy + Open in mail buttons
//   - No editable textarea, no template chips, no Send button

export function ContactDraftModal({
  open,
  onClose,
  recipientName,
  recipientEmail,
  recipientPhone,
  defaultChannel = "email",
  subject: initialSubject = "",
  emailBody = "",
  waBody = "",
  toMeta,
  reMeta,
  title = "Draft message",
  subtitle = "Pre-filled · copy and send via your preferred channel",
}: ContactDraftModalProps) {
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const titleId   = useId();
  const cardRef   = useRef<HTMLDivElement>(null);

  // Reset channel when modal opens
  useEffect(() => {
    if (open) setChannel(defaultChannel);
  }, [open, defaultChannel]);

  // Global Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Focus trap
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key !== "Tab" || !cardRef.current) return;
    const focusable = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function copyDraft() {
    const text =
      channel === "email"
        ? (initialSubject ? `Subject: ${initialSubject}\n\n` : "") + emailBody
        : waBody;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function openInMail() {
    const mailto =
      "mailto:" + (recipientEmail ?? "") +
      "?subject=" + encodeURIComponent(initialSubject) +
      "&body=" + encodeURIComponent(emailBody);
    window.open(mailto);
  }

  // Derive To/Re display
  const toDisplay =
    toMeta ??
    (recipientName && recipientEmail
      ? `${recipientName} · ${recipientEmail}`
      : recipientEmail ?? recipientName ?? "—");
  const reDisplay = reMeta ?? initialSubject ?? "";

  const activeEmailBody = emailBody;
  const activeWaBody    = waBody;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    // Gap 41: backdrop rgba(0,0,0,0.5)
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden="false"
    >
      {/* Gap 40: maxWidth 580; Gap 42: borderRadius 10; Gap 43: shadow 0 24px 80px */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: "#fff",
          borderRadius: 10,
          width: "100%",
          maxWidth: 580,
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Gap 29: Dark header */}
        <div
          style={{
            background: "#0f1117",
            padding: "1.1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              id={titleId}
              style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}
            >
              {title}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              {subtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              fontSize: 18,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              flexShrink: 0,
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(15,17,23,.10)",
            background: "#f8f7f4",
            flexShrink: 0,
          }}
        >
          {(["email", "whatsapp"] as Channel[]).map((ch) => {
            const isActive = channel === ch;
            return (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                style={{
                  padding: ".65rem 1.1rem",
                  fontSize: 12,
                  fontWeight: 500,
                  color: isActive ? "#0f1117" : "#4a4d5c",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${isActive ? "#c9982a" : "transparent"}`,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >
                {ch === "email" ? "Email" : "WhatsApp"}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {/* draft-meta gray bar */}
          <div
            style={{
              background: "#f8f7f4",
              borderRadius: 8,
              padding: ".75rem 1rem",
              marginBottom: "1rem",
              fontSize: 12,
              color: "#4a4d5c",
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: "#0f1117", fontWeight: 500 }}>To:</span> {toDisplay}
            {reDisplay && (
              <>
                <br />
                <span style={{ color: "#0f1117", fontWeight: 500 }}>Re:</span> {reDisplay}
              </>
            )}
          </div>

          {/* Email panel */}
          {channel === "email" && (
            <div>
              {/* draft-subject */}
              {initialSubject && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0f1117",
                    marginBottom: ".75rem",
                    paddingBottom: ".65rem",
                    borderBottom: "1px solid rgba(15,17,23,.10)",
                  }}
                >
                  Subject: {initialSubject}
                </div>
              )}
              {/* draft-text read-only */}
              <div
                style={{
                  fontSize: 13,
                  color: "#4a4d5c",
                  lineHeight: 1.85,
                  whiteSpace: "pre-wrap",
                  background: "#f8f7f4",
                  borderRadius: 8,
                  padding: "1rem",
                  border: "1px solid rgba(15,17,23,.10)",
                }}
              >
                {activeEmailBody || "No message drafted yet."}
              </div>
            </div>
          )}

          {/* WhatsApp panel */}
          {channel === "whatsapp" && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "#4a4d5c",
                  lineHeight: 1.85,
                  whiteSpace: "pre-wrap",
                  background: "#f8f7f4",
                  borderRadius: 8,
                  padding: "1rem",
                  border: "1px solid rgba(15,17,23,.10)",
                }}
              >
                {activeWaBody || "No WhatsApp message drafted yet."}
              </div>
            </div>
          )}
        </div>

        {/* Footer: note + Copy + Open in mail */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(15,17,23,.10)",
            display: "flex",
            alignItems: "center",
            gap: ".65rem",
            flexShrink: 0,
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 11, color: "#9496a1", flex: 1, lineHeight: 1.5 }}>
            Edit as needed before sending. Nothing is sent automatically.
          </div>

          {/* Copy ghost btn */}
          <button
            type="button"
            onClick={copyDraft}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              padding: "6px 12px",
              borderRadius: 100,
              border: "1px solid rgba(15,17,23,.18)",
              background: "#fff",
              color: "#4a4d5c",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>

          {/* Open in mail dark btn — only shown on email tab */}
          {channel === "email" && (
            <button
              type="button"
              onClick={openInMail}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                padding: "6px 12px",
                borderRadius: 100,
                border: "none",
                background: "#0f1117",
                color: "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Open in mail
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
