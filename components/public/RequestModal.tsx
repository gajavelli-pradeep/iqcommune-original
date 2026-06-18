"use client";

import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SessionRequestSchema,
  type SessionRequest,
  AUDIENCE_OPTIONS,
  GROUP_SIZE_OPTIONS,
} from "@/lib/schemas/session-request";
import { MODULES } from "@/lib/schemas/application";

export function RequestModal() {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionRequest>({
    resolver: zodResolver(SessionRequestSchema),
  });

  // Auto-focus first focusable element when modal opens
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const el = dialogRef.current.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), button:not([disabled])'
    );
    el?.focus();
  }, [open]);

  // Trap focus within dialog; close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { handleClose(); return; }
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function onSubmit(data: SessionRequest) {
    setServerError("");
    try {
      const res = await fetch("/api/session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setServerError(body.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setServerError("Network error. Please check your connection.");
    }
  }

  function handleClose() {
    setOpen(false);
    setSuccess(false);
    setServerError("");
    reset();
    // Restore focus to the trigger that opened the modal
    setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={triggerStyle}
      >
        Request a Session →
      </button>

      {open && (
        <div
          style={overlayStyle}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            style={dialogStyle}
            onKeyDown={handleKeyDown}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2 id={titleId} style={{ fontSize: 18, fontWeight: 600 }}>
                  Request a session
                </h2>
                <p style={{ fontSize: 13, color: "#9496a1", marginTop: 2 }}>
                  We&apos;ll match you with a finance practitioner and confirm within 2–3 days.
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#9496a1",
                }}
              >
                ×
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={checkCircle}>
                  <svg
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>
                  Request received.
                </h3>
                <p style={{ fontSize: 13, color: "#4a4d5c", lineHeight: 1.65 }}>
                  We&apos;ll be in touch with practitioner options within 2–3 working days.
                </p>
                <button onClick={handleClose} style={{ marginTop: 20, ...triggerStyle }}>
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                style={{ display: "grid", gap: 14 }}
              >
                <div style={rowTwo}>
                  <Field label="Your name" error={errors.name?.message}>
                    <input {...register("name")} style={inputStyle} placeholder="Suresh Patel" />
                  </Field>
                  <Field label="Organisation" error={errors.org?.message}>
                    <input {...register("org")} style={inputStyle} placeholder="TechCorp India" />
                  </Field>
                </div>
                <div style={rowTwo}>
                  <Field label="Email" error={errors.email?.message}>
                    <input
                      {...register("email")}
                      type="email"
                      style={inputStyle}
                      placeholder="suresh@techcorp.in"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <input {...register("phone")} style={inputStyle} placeholder="+91 99999 88888" />
                  </Field>
                </div>
                <Field label="Topic / module" error={errors.topic?.message}>
                  <select {...register("topic")} style={inputStyle}>
                    <option value="">Select a topic</option>
                    {MODULES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <div style={rowTwo}>
                  <Field label="Audience type" error={errors.audienceType?.message}>
                    <select {...register("audienceType")} style={inputStyle}>
                      <option value="">Select type</option>
                      {AUDIENCE_OPTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Group size" error={errors.groupSize?.message}>
                    <select {...register("groupSize")} style={inputStyle}>
                      <option value="">Select size</option>
                      {GROUP_SIZE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Min. participant commitment" error={errors.minCommit?.message}>
                  <input
                    {...register("minCommit", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    style={inputStyle}
                    placeholder="e.g. 15"
                  />
                </Field>
                <Field label="Preferred dates" error={errors.preferredDates?.message}>
                  <input
                    {...register("preferredDates")}
                    style={inputStyle}
                    placeholder="e.g. July 2nd week, weekday mornings"
                  />
                </Field>
                <Field label="Venue (optional)">
                  <input
                    {...register("venue")}
                    style={inputStyle}
                    placeholder="Office address or online"
                  />
                </Field>

                {serverError && (
                  <div
                    role="alert"
                    style={{
                      background: "#fdf0f0",
                      border: "1px solid #f0b0b0",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "#a32d2d",
                    }}
                  >
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={submitStyle(isSubmitting)}
                >
                  {isSubmitting ? "Submitting…" : "Submit Request →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5 }}
      >
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error && (
        <p id={errorId} style={{ fontSize: 12, color: "#a32d2d", marginTop: 3 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// outline removed — globals.css :focus-visible provides the gold ring
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(15,17,23,.18)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  boxSizing: "border-box",
};
const triggerStyle: React.CSSProperties = {
  background: "#c9982a",
  color: "#fff",
  border: "none",
  borderRadius: 100,
  padding: "13px 28px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,17,23,.5)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};
const dialogStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.75rem",
  maxWidth: 560,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
};
// auto-fit so columns collapse to single-column on narrow mobile viewports
const rowTwo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};
const checkCircle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "#eef7ee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 1rem",
  color: "#2a6b2a",
};

function submitStyle(loading: boolean): React.CSSProperties {
  return {
    padding: "12px",
    background: "#0f1117",
    color: "#fff",
    border: "none",
    borderRadius: 100,
    fontSize: 14,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    fontFamily: "inherit",
  };
}
