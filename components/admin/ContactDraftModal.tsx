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
  /**
   * V6 §3: editable send-preview. When true (and `onSend` is set), the subject and
   * both message bodies become contenteditable and a "Click to send" button reads
   * the live-edited content at click time. The caller's `onSend` owns what happens
   * next (instant send, or a 15s-undo delayed send) and closes the modal.
   */
  editable?: boolean;
  /** Label for the send button in editable mode (default "Click to send"). */
  sendLabel?: string;
  /**
   * Send action. In read-only mode it's a plain auto-send (email only); in editable
   * mode it receives the live-edited draft. Must resolve — never throw.
   */
  onSend?: (edited: EditedDraft) => Promise<{ ok: boolean; error?: string } | void> | void;
}

export interface EditedDraft {
  subject: string;
  emailBody: string;
  waBody: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

// Gap 29: Rebuilt to match source design:
//   - Dark header (var(--ink) bg) with white title/subtitle and white ✕ close
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
  subtitle = "Click into the text below to edit before sending",
  editable = false,
  sendLabel = "Click to send",
  onSend,
}: ContactDraftModalProps) {
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent">("idle");
  const [sendError, setSendError] = useState("");
  const titleId   = useId();
  const cardRef   = useRef<HTMLDivElement>(null);
  // Live-edited content refs (editable mode) — read at send/copy/mail time so an
  // edit made in the modal is never silently discarded (V6 §3 getLiveDraftText).
  const subjectRef   = useRef<HTMLDivElement>(null);
  const emailBodyRef = useRef<HTMLDivElement>(null);
  const waBodyRef    = useRef<HTMLDivElement>(null);

  function getLiveDraft(): EditedDraft {
    return {
      subject:   editable ? (subjectRef.current?.textContent ?? initialSubject) : initialSubject,
      emailBody: editable ? (emailBodyRef.current?.textContent ?? emailBody) : emailBody,
      waBody:    editable ? (waBodyRef.current?.textContent ?? waBody) : waBody,
    };
  }

  async function handleSend() {
    if (!onSend || sendState === "sending") return;
    // Editable mode: hand the live-edited draft to the caller (which schedules the
    // real send + closes), then close. No "Sent ✓" here — the caller owns feedback.
    if (editable) {
      const edited = getLiveDraft();
      onClose();
      await onSend(edited);
      return;
    }
    setSendState("sending");
    setSendError("");
    const res = await onSend(getLiveDraft());
    const { ok, error } = (res ?? { ok: true }) as { ok: boolean; error?: string };
    setSendState(ok ? "sent" : "idle");
    if (!ok) setSendError(error ?? "Couldn't send. Copy the draft and send it manually instead.");
  }

  // Reset to the caller's default channel each time the modal (re)opens — a
  // controlled-prop sync, not a render-derived value.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChannel(defaultChannel);
      setSendState("idle");
      setSendError("");
    }
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

  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    const live = getLiveDraft();
    const text =
      channel === "email"
        ? (live.subject ? `Subject: ${live.subject}\n\n` : "") + live.emailBody
        : live.waBody;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API requires secure context (HTTPS) — show inline feedback
      setCopied(false);
    }
  }

  function openInMail() {
    const live = getLiveDraft();
    const mailto =
      "mailto:" + (recipientEmail ?? "") +
      "?subject=" + encodeURIComponent(live.subject) +
      "&body=" + encodeURIComponent(live.emailBody);
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
            background: "var(--ink)",
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
                  color: isActive ? "var(--ink)" : "var(--ink-soft)",
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
              color: "var(--ink-soft)",
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>To:</span> {toDisplay}
            {reDisplay && (
              <>
                <br />
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>Re:</span> {reDisplay}
              </>
            )}
          </div>

          {/* Email panel */}
          {channel === "email" && (
            <div>
              {/* draft-subject — editable when in send-preview mode */}
              {(initialSubject || editable) && (
                editable ? (
                  <div style={{ marginBottom: ".75rem" }}>
                    <div style={editLabelStyle}>Subject</div>
                    <div
                      ref={subjectRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-label="Email subject"
                      style={editSubjectStyle}
                    >
                      {initialSubject}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--ink)",
                      marginBottom: ".75rem",
                      paddingBottom: ".65rem",
                      borderBottom: "1px solid rgba(15,17,23,.10)",
                    }}
                  >
                    Subject: {initialSubject}
                  </div>
                )
              )}
              {editable && <div style={editLabelStyle}>Message</div>}
              <div
                ref={emailBodyRef}
                contentEditable={editable}
                suppressContentEditableWarning
                role={editable ? "textbox" : undefined}
                aria-label={editable ? "Email body" : undefined}
                aria-multiline={editable ? true : undefined}
                style={editable ? editBodyStyle : readBodyStyle}
              >
                {activeEmailBody || (editable ? "" : "No message drafted yet.")}
              </div>
            </div>
          )}

          {/* WhatsApp panel */}
          {channel === "whatsapp" && (
            <div>
              {editable && <div style={editLabelStyle}>WhatsApp message</div>}
              <div
                ref={waBodyRef}
                contentEditable={editable}
                suppressContentEditableWarning
                role={editable ? "textbox" : undefined}
                aria-label={editable ? "WhatsApp body" : undefined}
                aria-multiline={editable ? true : undefined}
                style={editable ? editBodyStyle : readBodyStyle}
              >
                {activeWaBody || (editable ? "" : "No WhatsApp message drafted yet.")}
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
            // Wrap the button row below the note on narrow modals (≤430px) so no
            // action is clipped by the card's overflow:hidden (atomic-responsive #2/#3).
            flexWrap: "wrap",
          }}
        >
          <div
            role={sendError ? "alert" : undefined}
            style={{ fontSize: 11, color: sendError ? "var(--red)" : "var(--ink-faint)", flex: 1, minWidth: 0, lineHeight: 1.5 }}
          >
            {sendError
              ? sendError
              : sendState === "sent"
                ? "Sent. You can also copy the draft to send it again."
                : editable && onSend
                  ? "Click into the subject or message to edit, then Send. Nothing sends until you click Send."
                  : onSend && channel === "email"
                    ? "Send directly, or copy to send it your own way."
                    : "Edit as needed before sending. Nothing is sent automatically."}
          </div>

          {/* Send — email tab only. In editable mode this is the V6 "Click to send". */}
          {onSend && channel === "email" && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sendState === "sending" || sendState === "sent"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 100,
                border: "none",
                background: sendState === "sent" ? "var(--green)" : "var(--gold)",
                color: sendState === "sent" ? "#fff" : "var(--ink)",
                cursor: sendState === "sending" || sendState === "sent" ? "default" : "pointer",
                opacity: sendState === "sending" ? 0.7 : 1,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {sendState === "sending" ? "Sending…" : sendState === "sent" ? "Sent ✓" : editable ? sendLabel : "Send via email"}
            </button>
          )}

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
              border: `1px solid ${copied ? "var(--green-border)" : "rgba(15,17,23,.18)"}`,
              background: copied ? "var(--green-light)" : "#fff",
              color: copied ? "var(--green)" : "var(--ink-soft)",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "background 0.15s, border-color 0.15s, color 0.15s",
            }}
          >
            <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {copied ? "Copied!" : "Copy"}
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
                background: "var(--ink)",
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

// ── Editable send-preview styles (V6 §3) ────────────────────────────────────────
const editLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  marginBottom: 4,
};

const editSubjectStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink)",
  background: "#fff",
  border: "1px solid var(--border-input)",
  borderRadius: 8,
  padding: "8px 11px",
  outline: "none",
};

const editBodyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ink)",
  lineHeight: 1.85,
  whiteSpace: "pre-wrap",
  background: "#fff",
  borderRadius: 8,
  padding: "1rem",
  border: "1px solid var(--border-input)",
  outline: "none",
  minHeight: 120,
};

const readBodyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ink-soft)",
  lineHeight: 1.85,
  whiteSpace: "pre-wrap",
  background: "#f8f7f4",
  borderRadius: 8,
  padding: "1rem",
  border: "1px solid rgba(15,17,23,.10)",
};
