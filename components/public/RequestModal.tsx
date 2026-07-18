"use client";

import { SelectField, type SelectFieldItem } from "@/components/public/SelectField";
import { BUNDLES, BUNDLE_LABELS, MODULES } from "@/lib/schemas/session-request";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Constants ────────────────────────────────────────────────────────────────

type AudienceType = "group" | "org" | "amc";
type GroupSize = "5-8" | "9-15" | "16-25" | "";

// Gap 1: variant prop to differentiate nav/hero (dark) from CTA section (gold)
export type ModalVariant = "nav" | "hero" | "gold" | "mobile";

const AUDIENCE_CHIPS: { id: AudienceType; label: string }[] = [
  { id: "group", label: "Group (register as SPOC)" },
  { id: "org", label: "Organisations & Institutions" },
  { id: "amc", label: "AMC / Wealth Firm" },
];

const GROUP_SIZE_OPTIONS: { value: GroupSize; label: string }[] = [
  { value: "5-8", label: "5 – 8 people" },
  { value: "9-15", label: "9 – 15 people" },
  { value: "16-25", label: "16 – 25 people" },
];

// Topic dropdown: two titled groups + a trailing ungrouped option (label ≠ value
// for bundles) — the branded SelectField renders this natively.
const TOPIC_OPTIONS: SelectFieldItem[] = [
  { label: "Modules", options: MODULES.map((m) => ({ value: m, label: m })) },
  {
    label: "Bundled Sessions (6 hrs)",
    options: BUNDLES.map((b) => ({ value: b, label: BUNDLE_LABELS[b] })),
  },
  { value: "Not sure — help me choose", label: "Not sure — help me choose" },
];

// ── Modal-id → canonical API/DB vocabulary (must match SessionRequestSchema) ──
const AUDIENCE_API: Record<AudienceType, string> = {
  group: "Groups",
  org: "Organisations & Institutions",
  amc: "AMCs & Wealth Firms",
};

const MIN_COMMIT_VALUE: Record<Exclude<GroupSize, "">, number> = {
  "5-8": 5,
  "9-15": 9,
  "16-25": 16,
};

const MIN_COMMIT_TEXT: Record<Exclude<GroupSize, "">, string> = {
  "5-8":
    "Your selected range is 5–8 people. The minimum charge applies to 5 participants — even if fewer attend on the day.",
  "9-15":
    "Your selected range is 9–15 people. The minimum charge applies to 9 participants — even if fewer attend on the day.",
  "16-25":
    "Your selected range is 16–25 people. The minimum charge applies to 16 participants — even if fewer attend on the day.",
};

const SPOC_MIN_LABEL: Record<Exclude<GroupSize, "">, string> = {
  "5-8": "5 participants",
  "9-15": "9 participants",
  "16-25": "16 participants",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  firstName: string;
  lastName: string;
  org: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  topic: string;
  groupSize: GroupSize;
  dateWindow: string;
  venue: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  org: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  topic: "",
  groupSize: "",
  dateWindow: "",
  venue: "",
  notes: "",
};

// ── Styles ────────────────────────────────────────────────────────────────────

// Gap 1: nav dark button style
const navTriggerStyle: React.CSSProperties = {
  background: "#14161d",
  color: "#fff",
  border: "none",
  borderRadius: 100,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 500,
  // Preflight gives <button> `line-height: inherit`, which pulls in the body's 1.7
  // and renders this 5px taller than the V5 spec. `normal` restores the 38.67px box.
  // The 44px touch floor lives in globals.css, gated on a coarse pointer.
  lineHeight: "normal",
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

// Gap 1: hero CTA dark button style (btn-primary)
const heroCTATriggerStyle: React.CSSProperties = {
  background: "#14161d",
  color: "#fff",
  border: "none",
  borderRadius: 100,
  padding: "14px 30px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  minHeight: 44,
  minWidth: 44,
};

// Mobile drawer — full-width dark button
const mobileTriggerStyle: React.CSSProperties = {
  background: "#14161d",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "14px 22px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  minHeight: 52,
};

// Gap 19: CTA section gold button style (btn-gold) with speech-bubble icon
const goldTriggerStyle: React.CSSProperties = {
  background: "linear-gradient(180deg,#d4a43a 0%,#c9982a 55%,#bd8d22 100%)",
  color: "#14161d",
  border: "1px solid #8a6510",
  borderRadius: 100,
  padding: "16px 36px",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(138,101,16,0.30), 0 10px 24px -10px rgba(201,152,42,0.45)",
  minHeight: 44,
  minWidth: 44,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  zIndex: 200,
  overflowY: "auto",
  // Keep touch scrolling inside the overlay from chaining to the locked page.
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "2rem 1rem",
};

const dialogStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  padding: "2.5rem",
  width: "100%",
  maxWidth: 520,
  border: "1px solid rgba(20,18,12,0.12)",
  boxShadow:
    "0 4px 8px rgba(20,16,10,0.07), 0 28px 56px -14px rgba(20,16,10,0.26)",
  position: "relative",
  margin: "auto",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid",
  borderColor: "rgba(20,18,12,0.13) rgba(20,18,12,0.13) rgba(20,18,12,0.22)",
  borderRadius: 9,
  fontFamily: "inherit",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--input-paper)",
  outline: "none",
  boxSizing: "border-box",
  resize: "none" as const,
  transition:
    "border-color .16s ease, box-shadow .16s ease, background .16s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: "0.01em",
  color: "#383b47",
  marginBottom: 6,
};

// ── Context JSX helpers (Gap 15, 16) ─────────────────────────────────────────

function GroupContextContent() {
  return (
    <>
      You are registering as the SPOC (primary contact) for your group. Minimum
      5 participants required. Sessions are priced per head — the minimum charge
      applies to the lower bound of your selected group size, regardless of
      actual attendance on the day.{" "}
      <strong style={{ color: "#14161d" }}>
        Venue booking and cost are your group&apos;s responsibility — happy to
        share a few suggestions for your city if you need them.
      </strong>{" "}
      You can also request a 6-hour bundled session covering two related modules
      — this requires a minimum of 9 participants.
    </>
  );
}

function OrgContextContent() {
  return (
    <>
      You are registering as the SPOC for your organisation. We&apos;ll tailor
      the session to your team&apos;s goals and align the right practitioner.{" "}
      <strong style={{ color: "#14161d" }}>
        Venue and basic infrastructure (seating, projector/screen) are to be
        arranged by your organisation. We handle everything else.
      </strong>{" "}
      You can also request a 6-hour bundled session — select a bundle option in
      the topic field below.
    </>
  );
}

function AmcContextContent() {
  return (
    <>
      You are registering as the SPOC for your firm. We&apos;ll match the right
      practitioner and structure the session around your goals.{" "}
      <strong style={{ color: "#14161d" }}>
        Venue and setup are on your end — we take care of the content and
        delivery.
      </strong>{" "}
      You can also request a 6-hour bundled session — select a bundle option in
      the topic field below.
    </>
  );
}

function ContextContent({ type }: { type: AudienceType }) {
  if (type === "org") return <OrgContextContent />;
  if (type === "amc") return <AmcContextContent />;
  return <GroupContextContent />;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RequestModalProps {
  // Gap 1 & 19: variant controls which trigger button style to use
  variant?: ModalVariant;
}

export function RequestModal({ variant = "nav" }: RequestModalProps) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedAudience, setAudience] = useState<AudienceType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [spocChecked, setSpocChecked] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Auto-focus first focusable element when modal opens
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const el = dialogRef.current.querySelector<HTMLElement>(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
    );
    el?.focus();
  }, [open]);

  // Lock body scroll while open so the page behind the dialog can't scroll on
  // touch; restore the prior value on every close/unmount path.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Trap focus within dialog; close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      handleClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
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

  function handleClose() {
    setOpen(false);
    setSuccess(false);
    setAudience(null);
    setForm(EMPTY_FORM);
    setSpocChecked(false);
    setValidationError("");
    setServerError("");
    setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function handleAudienceSelect(a: AudienceType | null) {
    setAudience(a);
    setValidationError("");
    // Reset audience-specific state when switching — SPOC wording changes per audience
    setSpocChecked(false);
    if (a !== "group") {
      setForm((prev) => ({ ...prev, groupSize: "", venue: "" }));
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");
    setServerError("");

    const audience = selectedAudience;
    if (!audience) {
      setValidationError("Please choose an audience type to continue.");
      return;
    }
    if (
      !form.firstName ||
      !form.email ||
      !form.phone ||
      !form.city ||
      !form.state ||
      !form.topic ||
      !form.dateWindow
    ) {
      setValidationError(
        "Please fill in all required fields (name, email, phone, city, state, topic, preferred date window) to continue.",
      );
      return;
    }
    if (audience === "group" && !form.groupSize) {
      setValidationError("Please select a group size.");
      return;
    }
    if (audience === "group" && !form.venue.trim()) {
      setValidationError("Please enter your venue details to continue.");
      return;
    }
    if ((audience === "org" || audience === "amc") && !form.org.trim()) {
      setValidationError(
        "Please enter your organisation or firm name to continue.",
      );
      return;
    }
    if (bundleGroupSizeError) {
      setValidationError(
        "Bundle sessions require a minimum group size of 9–15 participants.",
      );
      return;
    }
    if (!spocChecked) {
      setValidationError("Please confirm the declaration before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Payload MUST match SessionRequestSchema — see lib/schemas/session-request.ts.
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          city: form.city,
          state: form.state,
          audienceType: AUDIENCE_API[audience],
          orgName:
            audience === "org" || audience === "amc"
              ? form.org.trim() || undefined
              : undefined,
          topic: form.topic,
          groupSize:
            audience === "group" && form.groupSize ? form.groupSize : undefined,
          minCommit:
            audience === "group" && form.groupSize
              ? MIN_COMMIT_VALUE[form.groupSize as Exclude<GroupSize, "">]
              : undefined,
          venue:
            audience === "group" ? form.venue.trim() || undefined : undefined,
          preferredDates: form.dateWindow || undefined,
          notes: form.notes || undefined,
          spocDeclaration: true,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setServerError(body.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setServerError(
        "Network error — please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const showMinCommit = selectedAudience === "group" && form.groupSize !== "";

  const bundleGroupSizeError =
    selectedAudience === "group" &&
    form.topic.startsWith("Bundle") &&
    form.groupSize === "5-8";

  // Gap 1 & 19: resolve trigger style and icon based on variant
  const triggerStyle =
    variant === "gold"
      ? goldTriggerStyle
      : variant === "hero"
        ? heroCTATriggerStyle
        : variant === "mobile"
          ? mobileTriggerStyle
          : navTriggerStyle;

  // Gap 19: CTA section uses speech-bubble icon; nav/hero use arrow icon
  const triggerIcon =
    variant === "gold" ? (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ) : (
      <svg
        className="btn-arrow"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    );

  return (
    <>
      <button
        ref={triggerRef}
        className="btn-cta"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={triggerStyle}
      >
        {/* Gap 19: gold variant puts icon before text (source: icon then text) */}
        {variant === "gold" && triggerIcon}
        Request a Session
        {variant !== "gold" && triggerIcon}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
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
              {/* Close button */}
              <button
                onClick={handleClose}
                aria-label="Close dialog"
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-faint)",
                  fontSize: 18,
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                }}
              >
                ✕
              </button>

              {success ? (
                /* ── SUCCESS STATE ── */
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: "#eef7ee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1.25rem",
                      color: "#2a6b2a",
                    }}
                  >
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
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Request received!
                  </h3>
                  <p
                    style={{ fontSize: 14, color: "#383b47", lineHeight: 1.65 }}
                  >
                    We&apos;ll reach out within 2–3 working days to understand
                    your needs better and take the conversation forward. Keep an
                    eye on your inbox and phone.
                  </p>
                </div>
              ) : (
                /* ── FORM STATE ── */
                <form onSubmit={handleSubmit} noValidate>
                  <h2
                    id={titleId}
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      marginBottom: "0.3rem",
                    }}
                  >
                    Request a Session
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#383b47",
                      marginBottom: "1.4rem",
                    }}
                  >
                    Tell us a bit about what you need — we&apos;ll be in touch
                    within 2–3 working days to take it forward.
                  </p>

                  {/* ── Audience chips ── */}
                  <span style={labelStyle}>Who is this for?</span>
                  {/* Gap 23: chip padding changed to 7px 14px to match source */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: "1.1rem",
                    }}
                  >
                    {AUDIENCE_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="aud-chip"
                        onClick={() =>
                          handleAudienceSelect(
                            selectedAudience === chip.id ? null : chip.id,
                          )
                        }
                        style={{
                          padding: "8px 15px",
                          borderRadius: 100,
                          // Gap 13: active chip uses gold accent (source .aud-chip.active)
                          border: "1px solid",
                          borderColor:
                            selectedAudience === chip.id
                              ? "#c9982a"
                              : "rgba(20,18,12,0.13) rgba(20,18,12,0.13) rgba(20,18,12,0.22)",
                          background:
                            selectedAudience === chip.id
                              ? "#f5e9c8"
                              : "#fcfbf8",
                          color:
                            selectedAudience === chip.id
                              ? "#8a6510"
                              : "#383b47",
                          fontSize: 13,
                          fontWeight: selectedAudience === chip.id ? 600 : 500,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minHeight: 44,
                          boxShadow:
                            selectedAudience === chip.id
                              ? "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(201,152,42,0.22)"
                              : "inset 0 1px 1px rgba(255,255,255,0.7), 0 1px 1px rgba(20,18,12,0.03)",
                        }}
                        aria-pressed={selectedAudience === chip.id}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Gap 14: context callout always shown; default text when no audience selected */}
                  {/* Gap 22: padding updated to 10px 14px to match source */}
                  <div
                    style={{
                      background: "#f8f7f4",
                      border: "1px solid rgba(20,18,12,0.10)",
                      borderLeft: "3px solid #c9982a",
                      borderRadius: "0 8px 8px 0",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "#383b47",
                      marginBottom: "1.25rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      stroke="#8a6510"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <span>
                      {selectedAudience ? (
                        <ContextContent type={selectedAudience} />
                      ) : (
                        "Select an audience type above and we’ll tailor our follow-up accordingly."
                      )}
                    </span>
                  </div>

                  {/* ── Name row ── */}
                  <div className="rm-grid-2" style={{ marginBottom: "1rem" }}>
                    <div>
                      <label htmlFor="modal-fname" style={labelStyle}>
                        First name
                      </label>
                      <input
                        id="modal-fname"
                        type="text"
                        autoComplete="given-name"
                        value={form.firstName}
                        onChange={(e) =>
                          updateField("firstName", e.target.value)
                        }
                        placeholder="Rohan"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-lname" style={labelStyle}>
                        Last name
                      </label>
                      <input
                        id="modal-lname"
                        type="text"
                        autoComplete="family-name"
                        value={form.lastName}
                        onChange={(e) =>
                          updateField("lastName", e.target.value)
                        }
                        placeholder="Mehta"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* ── Email ── */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="modal-email" style={labelStyle}>
                      Email address
                    </label>
                    <input
                      id="modal-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="rohan@example.com"
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* ── Phone ── */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="modal-phone" style={labelStyle}>
                      Phone number
                    </label>
                    <input
                      id="modal-phone"
                      type="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      style={inputStyle}
                      required
                    />
                  </div>

                  {/* ── City + State (all audiences) ── */}
                  <div className="rm-grid-2" style={{ marginBottom: "1rem" }}>
                    <div>
                      <label htmlFor="modal-city" style={labelStyle}>
                        City
                      </label>
                      <input
                        id="modal-city"
                        type="text"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Mumbai"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="modal-state" style={labelStyle}>
                        State
                      </label>
                      <input
                        id="modal-state"
                        type="text"
                        autoComplete="address-level1"
                        value={form.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="Maharashtra"
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {/* ── Organisation (org / AMC audiences only) ── */}
                  {(selectedAudience === "org" ||
                    selectedAudience === "amc") && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label htmlFor="modal-org" style={labelStyle}>
                        {selectedAudience === "amc"
                          ? "Firm / AMC name"
                          : "Organisation name"}
                      </label>
                      <input
                        id="modal-org"
                        type="text"
                        value={form.org}
                        onChange={(e) => updateField("org", e.target.value)}
                        placeholder={
                          selectedAudience === "amc"
                            ? "e.g. HDFC AMC, Mirae Asset, Axis Securities, Anand Rathi Wealth"
                            : "e.g. TechCorp India, St. Xavier's College, Apollo Hospitals"
                        }
                        style={inputStyle}
                      />
                    </div>
                  )}

                  {/* ── Topic ── */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="modal-topic" style={labelStyle}>
                      Topic of interest
                    </label>
                    <SelectField
                      id="modal-topic"
                      options={TOPIC_OPTIONS}
                      value={form.topic}
                      onChange={(v) => updateField("topic", v)}
                      placeholder="Select a training topic…"
                    />
                    <div
                      style={{ fontSize: 11, color: "#71717f", marginTop: 4 }}
                    >
                      Bundled (6-hour) sessions are open to all audiences. For
                      Groups, this requires a minimum of 9 participants.
                    </div>
                  </div>

                  {/* ── Group size + Date row (Groups audience only) ── */}
                  {selectedAudience === "group" && (
                    <div className="rm-grid-2" style={{ marginBottom: "1rem" }}>
                      <div>
                        <label htmlFor="modal-groupsize" style={labelStyle}>
                          Group size
                        </label>
                        <SelectField
                          id="modal-groupsize"
                          options={GROUP_SIZE_OPTIONS}
                          value={form.groupSize}
                          onChange={(v) =>
                            updateField("groupSize", v as GroupSize)
                          }
                          placeholder="Select…"
                        />
                        <div
                          style={{
                            fontSize: 11,
                            color: "#71717f",
                            marginTop: 4,
                          }}
                        >
                          Sessions are capped at 25 participants.
                        </div>
                      </div>
                      <div>
                        <label htmlFor="modal-datewindow" style={labelStyle}>
                          Preferred date window
                        </label>
                        <input
                          id="modal-datewindow"
                          type="text"
                          value={form.dateWindow}
                          onChange={(e) =>
                            updateField("dateWindow", e.target.value)
                          }
                          placeholder="e.g. July last week"
                          style={inputStyle}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            color: "#71717f",
                            marginTop: 4,
                          }}
                        >
                          Rough window is fine — we confirm offline.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Preferred date (non-group audiences) ── */}
                  {selectedAudience && selectedAudience !== "group" && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label htmlFor="modal-datewindow-ng" style={labelStyle}>
                        Preferred date window
                      </label>
                      <input
                        id="modal-datewindow-ng"
                        type="text"
                        value={form.dateWindow}
                        onChange={(e) =>
                          updateField("dateWindow", e.target.value)
                        }
                        placeholder="e.g. July last week"
                        style={inputStyle}
                      />
                      <div
                        style={{ fontSize: 11, color: "#71717f", marginTop: 4 }}
                      >
                        Rough window is fine — we confirm offline.
                      </div>
                    </div>
                  )}

                  {/* ── Venue (Groups audience only) ── */}
                  {selectedAudience === "group" && (
                    <div style={{ marginBottom: "1rem" }}>
                      <label htmlFor="modal-venue" style={labelStyle}>
                        Your venue details
                      </label>
                      <input
                        id="modal-venue"
                        type="text"
                        value={form.venue}
                        onChange={(e) => updateField("venue", e.target.value)}
                        placeholder="e.g. Society clubhouse, office conference room, community hall…"
                        style={inputStyle}
                        required
                      />
                      <div
                        style={{ fontSize: 11, color: "#71717f", marginTop: 4 }}
                      >
                        Venue booking is your group&apos;s responsibility —
                        please share the space you&apos;ve finalised (or let us
                        know if you&apos;d like a few suggestions for your
                        city).
                      </div>
                    </div>
                  )}

                  {/* ── Bundle × group size warning ── */}
                  {bundleGroupSizeError && (
                    <div
                      style={{
                        background: "#fdf8ee",
                        border: "1px solid #c9982a",
                        borderLeft: "3px solid #c9982a",
                        borderRadius: "0 8px 8px 0",
                        padding: "0.85rem 1rem",
                        marginBottom: "0.75rem",
                        fontSize: 13,
                        color: "#8a6510",
                      }}
                    >
                      Bundles require a minimum group of 9–15 participants.
                      Please select a larger group size to continue with this
                      bundle.
                    </div>
                  )}

                  {/* ── Min commitment callout (Groups only + size selected) ── */}
                  {showMinCommit && (
                    <div
                      style={{
                        background: "#f5e9c8",
                        border: "1px solid var(--gold-border)",
                        borderLeft: "3px solid #c9982a",
                        borderRadius: "0 8px 8px 0",
                        padding: "0.85rem 1rem",
                        marginBottom: "0.5rem",
                        fontSize: 13,
                        color: "#8a6510",
                        lineHeight: 1.65,
                      }}
                    >
                      <strong
                        style={{
                          color: "#14161d",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        Minimum attendance commitment
                      </strong>
                      {
                        MIN_COMMIT_TEXT[
                          form.groupSize as Exclude<GroupSize, "">
                        ]
                      }
                    </div>
                  )}

                  {/* ── Notes ── */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="modal-notes" style={labelStyle}>
                      Anything else?{" "}
                      <span style={{ fontWeight: 400, color: "#71717f" }}>
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="modal-notes"
                      rows={2}
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="e.g. specific focus areas, preferred language, city…"
                      style={inputStyle}
                    />
                  </div>

                  {/* ── SPOC declaration (all audiences, per-audience wording) ── */}
                  {selectedAudience && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          background: "#f8f7f4",
                          border: "1.5px solid rgba(20,18,12,0.18)",
                          borderRadius: 8,
                          padding: "0.9rem 1rem",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            cursor: "pointer",
                            fontSize: 13,
                            color: "#383b47",
                            lineHeight: 1.6,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={spocChecked}
                            onChange={(e) => setSpocChecked(e.target.checked)}
                            style={{
                              accentColor: "#c9982a",
                              width: 15,
                              height: 15,
                              flexShrink: 0,
                              marginTop: 3,
                            }}
                          />
                          <span>
                            {selectedAudience === "group" ? (
                              <>
                                I confirm I am registering as the{" "}
                                <strong style={{ color: "#14161d" }}>
                                  SPOC (primary contact)
                                </strong>{" "}
                                for this group and that at least{" "}
                                <strong style={{ color: "#14161d" }}>
                                  {form.groupSize
                                    ? SPOC_MIN_LABEL[
                                        form.groupSize as Exclude<GroupSize, "">
                                      ]
                                    : "5 participants"}
                                </strong>{" "}
                                will attend. I confirm I will coordinate venue
                                and logistics for the session, and acknowledge
                                that the minimum attendance commitment applies
                                regardless of actual turnout on the day.
                              </>
                            ) : selectedAudience === "org" ? (
                              <>
                                I confirm I am registering as the{" "}
                                <strong style={{ color: "#14161d" }}>
                                  SPOC (primary contact)
                                </strong>{" "}
                                for this organisation and will coordinate
                                internally on session logistics, venue, and
                                participant attendance.
                              </>
                            ) : (
                              <>
                                I confirm I am registering as the{" "}
                                <strong style={{ color: "#14161d" }}>
                                  SPOC (primary contact)
                                </strong>{" "}
                                for this firm and will coordinate internally on
                                session logistics, venue, and participant
                                attendance.
                              </>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* ── Validation error ── */}
                  {validationError && (
                    <div
                      role="alert"
                      style={{
                        background: "#fdf0f0",
                        border: "1px solid var(--red-border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "#a32d2d",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {validationError}
                    </div>
                  )}

                  {/* ── Server error ── */}
                  {serverError && (
                    <div
                      role="alert"
                      style={{
                        background: "#fdf0f0",
                        border: "1px solid var(--red-border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "#a32d2d",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {serverError}
                    </div>
                  )}

                  {/* Gap 17: submit button uses SVG arrow icon, not text arrow */}
                  <button
                    type="submit"
                    className="btn-cta"
                    disabled={isSubmitting || !!bundleGroupSizeError}
                    style={{
                      width: "100%",
                      marginTop: "1.25rem",
                      background: isSubmitting
                        ? "#2a2d38"
                        : "linear-gradient(180deg,#1f222e 0%,#14161d 100%)",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: "0.01em",
                      padding: 15,
                      borderRadius: 100,
                      border: "none",
                      boxShadow: isSubmitting
                        ? "none"
                        : "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 14px rgba(20,18,12,0.22)",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      opacity: isSubmitting ? 0.6 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 44,
                    }}
                  >
                    {isSubmitting ? (
                      "Sending…"
                    ) : (
                      <>
                        Send Request
                        <svg
                          className="btn-arrow"
                          width="15"
                          height="15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>

                  <p
                    style={{
                      fontSize: 12,
                      color: "#71717f",
                      textAlign: "center",
                      marginTop: "0.75rem",
                    }}
                  >
                    No spam. We&apos;ll only reach out about your session
                    request.
                  </p>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
