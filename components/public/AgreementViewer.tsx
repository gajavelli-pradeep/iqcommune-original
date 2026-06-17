"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgreementSignSchema, type AgreementSign } from "@/lib/schemas/agreement";

const AGREEMENT_TEXT = `PRACTITIONER EMPANELMENT AGREEMENT

This Agreement is entered into between iqcommune ("Platform") and the Practitioner named in the empanelment link.

1. NATURE OF ENGAGEMENT
The Practitioner agrees to conduct educational sessions on financial topics as listed in their application. This engagement is purely in the capacity of an independent educator and does not constitute employment, agency, or partnership.

2. SCOPE OF SESSIONS
Sessions shall cover only those modules for which the Practitioner has been empanelled. No financial advice, product recommendations, or solicitation of any kind is permitted during or after sessions.

3. REVENUE SHARING
The Platform shall pay the Practitioner the agreed session fee as communicated in the Per-Session Confirmation document. Payment shall be made within 7 working days of session completion, subject to TDS deduction under Section 194J of the Income Tax Act (10% with PAN, 20% without PAN).

Per-Session Confirmation: Before every session, the Practitioner shall receive a Session Confirmation document containing session details, payout breakdown, and TDS calculation. The Practitioner must provide digital consent before the session is confirmed.

4. IDENTITY & PRIVACY — TWO-TIER DISCLOSURE
(a) Public Anonymity: The Practitioner's identity (name, employer, role) shall NOT be disclosed publicly on the Platform at any time.
(b) Operational Disclosure: Upon session confirmation and with the Practitioner's explicit consent captured digitally, the Practitioner's name, role, and organisation may be shared with the session client for coordination purposes only.

4A. PAYMENT PREFERENCES
The Practitioner may nominate a family member to receive session payments on their behalf. This election must be made in writing and is subject to the same TDS deductions.

5. PRACTITIONER CONDUCT
The Practitioner shall: (a) Deliver sessions professionally and punctually; (b) Not record sessions without explicit written consent from all parties; (c) Not share session materials externally; (d) Maintain confidentiality of client information.

6. POST-SESSION CONDUCT
The Practitioner shall not directly solicit, approach, or engage with session participants outside of the Platform for a period of 12 months following any session.

7. CONFIDENTIALITY
The Practitioner shall treat all client information, session content requests, and Platform operational details as strictly confidential.

8. CONFLICT OF INTEREST
The Practitioner confirms that this engagement does not conflict with any existing employment agreement, professional obligation, or regulatory restriction applicable to their current role.

9. INTELLECTUAL PROPERTY
All session content, materials, and derivatives created for sessions belong to the Practitioner. The Platform may request written consent to record, reproduce, or distribute session content for internal quality review purposes only.

10. TERM & TERMINATION
This Agreement remains in effect indefinitely unless terminated by either party with 30 days' written notice. The Platform may terminate immediately for material breach.

11. LIMITATION OF LIABILITY
The Platform's liability in connection with any session shall not exceed the session fee paid for that specific session.

12. GOVERNING LAW
This Agreement is governed by the laws of India. All disputes shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka.

13. ENTIRE AGREEMENT
This Agreement, together with the Per-Session Confirmation documents issued for each session, constitutes the entire agreement between the parties.`;

interface SignResult {
  timestamp: string;
  refCode: string;
  signedBy: string;
}

export function AgreementViewer() {
  const params = useSearchParams();
  const pName = params.get("name") ?? "Practitioner";
  const pRole = params.get("role") ?? "";
  const pOrg = params.get("org") ?? "";
  const pModule = params.get("module") ?? "";
  const pRef = params.get("ref") ?? "";

  const refCode = `IQC-EMP-${pRef}`;

  const [hasScrolled, setHasScrolled] = useState(false);
  const [sigMode, setSigMode] = useState<"drawn" | "typed">("drawn");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [typedSig, setTypedSig] = useState("");
  const [result, setResult] = useState<SignResult | null>(null);
  const [serverError, setServerError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgreementSign>({
    resolver: zodResolver(AgreementSignSchema),
    defaultValues: { ref: refCode, sigMode: "drawn" },
  });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.parentElement!.clientWidth;
    canvas.width = w * ratio;
    canvas.height = 120 * ratio;
    canvas.style.width = w + "px";
    canvas.style.height = "120px";
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#0f1117";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener("resize", initCanvas);
    return () => window.removeEventListener("resize", initCanvas);
  }, [initCanvas]);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setIsDrawing(true);
    lastPoint.current = getPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !lastPoint.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    setHasSig(true);
  }

  function endDraw() {
    setIsDrawing(false);
    lastPoint.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  }

  async function onSubmit(data: AgreementSign) {
    setServerError("");

    let sigData = data.sigData;
    if (sigMode === "drawn") {
      if (!hasSig) {
        setServerError("Please draw your signature");
        return;
      }
      sigData = canvasRef.current!.toDataURL("image/png");
    } else {
      if (!typedSig.trim()) {
        setServerError("Please type your name as signature");
        return;
      }
      sigData = typedSig;
    }

    const res = await fetch("/api/onboarding/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        ref: refCode,
        sigMode,
        sigData,
      }),
    });

    if (res.ok) {
      setResult(await res.json());
    } else {
      const body = await res.json();
      setServerError(body.error ?? "Signing failed. Please try again.");
    }
  }

  if (result) {
    return (
      <div style={{ maxWidth: 700, margin: "3rem auto", padding: "0 1.5rem" }}>
        <div style={{ background: "#fff", border: "1px solid rgba(15,17,23,.1)", borderRadius: 12, padding: "3rem 2rem", textAlign: "center" }}>
          <div style={checkCircle}>
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Agreement signed. Welcome to iqcommune.</h1>
          <p style={{ fontSize: 14, color: "#4a4d5c", marginBottom: "2rem", lineHeight: 1.65 }}>
            Your empanelment is confirmed. We&apos;ll be in touch with your first session details within 2–3 working days.
          </p>
          <div style={{ background: "#f8f7f4", border: "1px solid rgba(15,17,23,.1)", borderRadius: 10, padding: "1.25rem 1.5rem", maxWidth: 440, margin: "0 auto", textAlign: "left" }}>
            {[
              ["Signed by", result.signedBy],
              ["Agreement ref.", result.refCode],
              ["Module assigned", pModule],
              ["Timestamp", new Date(result.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
              ["Status", "✓ Digitally signed"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid rgba(15,17,23,.08)", fontSize: 13 }}>
                <span style={{ color: "#9496a1" }}>{label}</span>
                <span style={{ fontWeight: 500, color: label === "Status" ? "#2a6b2a" : "#0f1117" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 13, color: "#9496a1", marginBottom: 8 }}>Step 3 of 4 — Review &amp; Sign</div>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Practitioner Empanelment Agreement</h1>
        <p style={{ fontSize: 14, color: "#4a4d5c", marginTop: 6, lineHeight: 1.65 }}>
          Hi {pName.split(" ")[0]}, please read the agreement below in full before signing.
          Your details: <strong>{pRole}</strong>{pOrg ? ` · ${pOrg}` : ""} · Module: <strong>{pModule}</strong>
        </p>
      </div>

      {/* Agreement scroll area */}
      <div
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!hasScrolled && el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
            setHasScrolled(true);
          }
        }}
        style={{
          height: 340,
          overflowY: "auto",
          border: "1px solid rgba(15,17,23,.15)",
          borderRadius: 10,
          padding: "1.25rem 1.5rem",
          fontSize: 13,
          lineHeight: 1.8,
          color: "#0f1117",
          background: "#fafaf9",
          marginBottom: 16,
          whiteSpace: "pre-wrap",
          fontFamily: "Georgia, serif",
        }}
      >
        {AGREEMENT_TEXT}
      </div>

      {!hasScrolled && (
        <p style={{ fontSize: 12, color: "#9496a1", textAlign: "center", marginBottom: 20 }}>
          ↓ Scroll to the bottom of the agreement to unlock the signature section
        </p>
      )}

      {/* Signature section */}
      {hasScrolled && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ background: "#fff", border: "1px solid rgba(15,17,23,.12)", borderRadius: 10, padding: "1.5rem", marginTop: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Sign the agreement</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Full legal name</label>
                <input {...register("fullName")} style={inputStyle} placeholder={pName} />
                {errors.fullName && <p style={errStyle}>{errors.fullName.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Designation</label>
                <input {...register("designation")} style={inputStyle} placeholder={pRole} />
                {errors.designation && <p style={errStyle}>{errors.designation.message}</p>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button type="button" onClick={() => setSigMode("drawn")} style={tabBtn(sigMode === "drawn")}>Draw signature</button>
              <button type="button" onClick={() => setSigMode("typed")} style={tabBtn(sigMode === "typed")}>Type signature</button>
            </div>

            {sigMode === "drawn" ? (
              <div>
                <div
                  style={{ border: "1.5px dashed rgba(15,17,23,.2)", borderRadius: 8, overflow: "hidden", background: "#fafaf9", position: "relative" }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                  {!hasSig && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#c4c5cc", fontSize: 13, pointerEvents: "none" }}>
                      Draw your signature here
                    </div>
                  )}
                </div>
                {hasSig && (
                  <button type="button" onClick={clearCanvas} style={{ fontSize: 12, color: "#9496a1", border: "none", background: "none", cursor: "pointer", marginTop: 6, fontFamily: "inherit" }}>
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <div>
                <input
                  value={typedSig}
                  onChange={(e) => {
                    setTypedSig(e.target.value);
                    setValue("sigData", e.target.value);
                  }}
                  style={{ ...inputStyle, fontFamily: "Georgia, serif", fontSize: 18, fontStyle: "italic" }}
                  placeholder="Type your full name"
                />
              </div>
            )}

            <input type="hidden" {...register("ref")} value={refCode} />
            <input type="hidden" {...register("sigMode")} value={sigMode as "drawn" | "typed"} />
            <input type="hidden" {...register("sigData")} />

            {serverError && (
              <div role="alert" style={{ background: "#fdf0f0", border: "1px solid #f0b0b0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#a32d2d", marginTop: 12 }}>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", marginTop: 20, padding: "13px", background: "#0f1117", color: "#fff", border: "none", borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1, fontFamily: "inherit" }}
            >
              {isSubmitting ? "Signing…" : "I agree — sign & complete empanelment →"}
            </button>

            <p style={{ fontSize: 11, color: "#9496a1", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              By signing, you confirm you have read and agree to the agreement above. Your IP address and a server timestamp are recorded for audit purposes.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

const checkCircle: React.CSSProperties = { width: 68, height: 68, borderRadius: "50%", background: "#eef7ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#2a6b2a" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid rgba(15,17,23,.18)", borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fff", boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5 };
const errStyle: React.CSSProperties = { fontSize: 12, color: "#a32d2d", marginTop: 4 };

function tabBtn(active: boolean): React.CSSProperties {
  return { padding: "7px 16px", borderRadius: 6, border: active ? "1.5px solid #0f1117" : "1px solid rgba(15,17,23,.15)", background: active ? "#0f1117" : "#fff", color: active ? "#fff" : "#4a4d5c", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 500 : 400 };
}
