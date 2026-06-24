"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AgreementSignSchema, type AgreementSign } from "@/lib/schemas/agreement";


interface SignResult {
  timestamp: string;
  refCode: string;
  signedBy: string;
}

export function AgreementViewer() {
  const params = useSearchParams();
  const pName   = params.get("name")   ?? "Practitioner";
  const pRole   = params.get("role")   ?? "";
  const pOrg    = params.get("org")    ?? "";
  const pModule = params.get("module") ?? "";
  const pRef    = params.get("ref")    ?? "";
  const pCity   = params.get("city")   ?? "";
  const pEmail  = params.get("email")  ?? "";

  const refCode = `IQC-EMP-${pRef}`;

  const [hasScrolled, setHasScrolled] = useState(false);
  const [sigMode, setSigMode] = useState<"drawn" | "typed">("drawn");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [typedSig, setTypedSig] = useState("");
  const [result, setResult] = useState<SignResult | null>(null);
  const [serverError, setServerError] = useState("");
  const [liveTs, setLiveTs] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgreementSign>({
    resolver: zodResolver(AgreementSignSchema),
    defaultValues: {
      ref: refCode,
      sigMode: "drawn",
      linkSig: params.get("sig") ?? "",
      linkParams: {
        name: pName,
        role: pRole,
        org: pOrg,
        module: pModule,
        city: params.get("city") ?? "",
        ref: pRef,
        email: params.get("email") ?? "",
      },
    },
  });

  // Live timestamp (IST, ticks every second)
  useEffect(() => {
    function updateTs() {
      setLiveTs(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    }
    updateTs();
    const id = setInterval(updateTs, 1000);
    return () => clearInterval(id);
  }, []);

  // Gap 38: canvas height changed from 160 to 120
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
    ctx.strokeStyle = "var(--ink)";
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

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sigMode === "drawn") {
      if (!hasSig) { setServerError("Please draw your signature"); return; }
      setValue("sigData", canvasRef.current!.toDataURL("image/png"));
    } else {
      if (!typedSig.trim()) { setServerError("Please type your name as signature"); return; }
      setValue("sigData", typedSig);
    }
    setValue("sigMode", sigMode);
    setServerError("");
    handleSubmit(onSubmit)();
  }

  async function onSubmit(data: AgreementSign) {
    try {
      const res = await fetch("/api/onboarding/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setServerError((body as { error?: string }).error ?? "Signing failed. Please try again.");
      }
    } catch {
      setServerError("Network error. Please try again.");
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  // Gap 50: maxWidth 860, margin "0 auto", padding "2.5rem 2rem 4rem"
  if (result) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 2rem 4rem" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(20,18,12,.1)",
            borderRadius: 12,
            padding: "3rem 2rem",
            textAlign: "center",
            marginTop: "2rem",
          }}
        >
          <div style={checkCircle}>
            <svg
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 8 }}>
            Agreement signed. Welcome to iqcommune.
          </h1>
          {/* Gap 46: success-sub copy matches source exactly */}
          <p
            style={{
              fontSize: 15,
              color: "var(--ink-soft)",
              marginBottom: "2rem",
              lineHeight: 1.65,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Your empanelment is confirmed. We&apos;ll be in touch with your first session details within 2–3 working days. Keep an eye on{" "}
            <span style={{ fontWeight: 500, color: "var(--ink)" }}>
              {pEmail || "your inbox"}
            </span>
            .
          </p>
          {/* Receipt box */}
          <div
            style={{
              background: "#f8f7f4",
              border: "1px solid rgba(20,18,12,.1)",
              borderRadius: 12,
              padding: "1.25rem 1.5rem",
              maxWidth: 480,
              margin: "0 auto",
              textAlign: "left",
            }}
          >
            {/* Gap 47: remove City row — only 5 rows: Signed by, Agreement ref., Module assigned, Timestamp, Status */}
            {/* Gap 48: borderBottom rgba(20,18,12,0.10) */}
            {/* Gap 49: both Timestamp and Status values are green */}
            {(
              [
                ["Signed by", result.signedBy],
                ["Agreement ref.", result.refCode],
                ["Module assigned", pModule],
                [
                  "Timestamp",
                  new Date(result.timestamp).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  }),
                ],
                ["Status", "✓ Digitally signed"],
              ] as [string, string][]
            ).map(([label, value], idx, arr) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0",
                  borderBottom: idx < arr.length - 1 ? "1px solid rgba(20,18,12,0.10)" : "none",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--ink-faint)" }}>{label}</span>
                <span
                  style={{
                    fontWeight: 500,
                    color: (label === "Status" || label === "Timestamp") ? "#2a6b2a" : "var(--ink)",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── WELCOME CARD ROWS ─────────────────────────────────────────────────────
  const welcomeRows: Array<[string, string]> = [
    ["Name", pName],
    ["Current role", pRole],
    ["Organisation", pOrg || "Independent"],
    ["Module assigned", pModule],
    ["City", pCity],
    ["Agreement reference", refCode],
  ];

  const agreementDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // ── MAIN FORM ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 2rem 4rem" }}>
      {/* Gap 51: Dancing Script removed; DM Sans should be loaded globally in layout.tsx */}

      {/* ── 1. WELCOME CARD ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(20,18,12,0.10)",
          borderRadius: 12,
          padding: "2rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Gap 8: card-title fontSize 18 */}
        <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: "0.4rem" }}>
          Welcome to the iqcommune practitioner network.
        </h3>
        {/* Gap 9: lineHeight 1.6; Gap 10: marginBottom 24 (1.5rem) */}
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 24 }}>
          Your application has been reviewed and we&apos;d love to have you on board. Please review your details below, read through the empanelment agreement carefully, and provide your digital signature to complete the onboarding.
        </p>
        {/* Gap 11: summary-grid marginBottom 24 (1.5rem) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginBottom: 24,
          }}
        >
          {welcomeRows.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#f8f7f4",
                borderRadius: 8,
                padding: "0.75rem 1rem",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 500,
                  marginBottom: 3,
                }}
              >
                {label}
              </span>
              {/* Gap 12: all summary values same color/fontFamily — no special treatment for Agreement reference */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--ink)",
                  fontFamily: "inherit",
                }}
              >
                {value || "—"}
              </span>
            </div>
          ))}
        </div>
        {/* Gap 13: icon size 13×13, strokeWidth 2, path M12 8v4M12 16h.01 */}
        {/* Gap 14: info text color var(--ink-faint) (ink-faint) */}
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>
          <svg
            width={13}
            height={13}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          If any detail above is incorrect, please reply to the email you received this link from before proceeding.
        </p>
      </div>

      {/* ── 2. AGREEMENT VIEWER (outer card wrapper) ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(20,18,12,0.10)",
          borderRadius: 12,
          padding: "2rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* card-title */}
        <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: "0.4rem" }}>
          Practitioner Empanelment Agreement
        </h3>
        {/* Gap 16: card-sub ABOVE the agreement-viewer div */}
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Please read the full agreement below before signing. You must scroll to the end to proceed.
        </p>

        {/* Gap 15: agreement-viewer border 1.5px solid rgba(20,18,12,0.20) */}
        <div
          style={{
            border: "1.5px solid rgba(20,18,12,0.20)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}
        >
          {/* Dark toolbar */}
          <div
            style={{
              background: "var(--ink)",
              padding: "0.75rem 1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#ffffff" }}>
                iqcommune — Practitioner Empanelment Agreement
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                {/* Gap 17: month 'long' for full month name */}
                {pRef ? `IQC-EMP-${pRef}` : "IQC-EMP-"} &nbsp;·&nbsp; {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: hasScrolled ? "#c9982a" : "rgba(255,255,255,0.50)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "color 0.3s",
              }}
            >
              {hasScrolled ? (
                <>✓ Agreement read</>
              ) : (
                <>
                  <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Scroll to read
                </>
              )}
            </span>
          </div>

          {/* Scroll area — Gap 18: threshold el.scrollHeight - 40 */}
          <div
            role="region"
            aria-label="Agreement text — scroll to bottom to unlock signing"
            tabIndex={0}
            onScroll={(e) => {
              const el = e.currentTarget;
              if (!hasScrolled && el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
                setHasScrolled(true);
              }
            }}
            style={{
              height: 420,
              overflowY: "auto",
              padding: "1.75rem 2rem",
              fontSize: 13,
              lineHeight: 1.75,
              color: "var(--ink)",
              background: "#ffffff",
            }}
          >
            {/* ── Agreement body ── */}

            {/* Gap 19: ag-title: fontSize 18, fontWeight 600, textAlign left, letterSpacing -0.01em, marginBottom 0.4rem */}
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink)",
                textAlign: "left",
                marginBottom: "0.4rem",
                letterSpacing: "-0.01em",
              }}
            >
              PRACTITIONER EMPANELMENT AGREEMENT
            </h3>

            {/* Gap 20: ag-sub: fontSize 13, textAlign left, no letterSpacing, marginBottom 24 */}
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-faint)",
                textAlign: "left",
                marginBottom: 24,
              }}
            >
              Non-Exclusive · Confidential · India
            </p>

            {/* Detail table — Gap 21: remove tr borderBottom; td padding 0.6rem 0.9rem */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 24,
                fontSize: 13,
              }}
            >
              <tbody>
                {(
                  [
                    ["Agreement Date", agreementDate],
                    [
                      "Platform",
                      "InvestQ Commune, operating as iqcommune (“the Platform”)",
                    ],
                    [
                      "Practitioner",
                      `${pName}${pCity ? " · " + pCity : ""}${pEmail ? " · " + pEmail : ""}`,
                    ],
                    ["Module(s)", pModule],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <tr key={label}>
                    <td
                      style={{
                        padding: "0.6rem 0.9rem",
                        background: "#f5e9c8",
                        color: "#8a6510",
                        fontWeight: 600,
                        width: "38%",
                        border: "1px solid rgba(20,18,12,0.10)",
                        fontSize: 13,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "0.6rem 0.9rem",
                        background: "#f8f7f4",
                        color: "var(--ink)",
                        fontWeight: 500,
                        border: "1px solid rgba(20,18,12,0.10)",
                        fontSize: 13,
                      }}
                    >
                      {value || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Divider */}
            <hr
              style={{
                border: "none",
                borderTop: "1px solid rgba(20,18,12,0.10)",
                margin: "20px 0",
              }}
            />

            {/* Gap 22: ag-preamble fontSize 13.5, marginBottom 20 */}
            <p
              style={{
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.7,
                marginBottom: 20,
              }}
            >
              This Agreement is entered into between the Platform and the Practitioner (individually a &quot;Party&quot;, collectively the &quot;Parties&quot;). Together they agree to the following terms governing the Practitioner&apos;s empanelment and participation in iqcommune sessions.
            </p>

            {/* Gap 23: clause titles — fontSize 14, fontWeight 600, marginTop 24, marginBottom 8 */}

            {/* Clause 1 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              1. NATURE OF ENGAGEMENT
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The Practitioner is empanelled as an independent contributor — not an employee, agent, or partner of the Platform. No employment relationship, joint venture, or partnership is created by this Agreement.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The engagement is non-exclusive. The Practitioner is free to conduct independent training, consulting, or advisory work outside of this Agreement.
            </p>

            {/* Clause 2 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              2. SCOPE OF ENGAGEMENT
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The Practitioner agrees to conduct in-person training sessions for the module(s) listed above, subject to availability confirmation prior to each session.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (a) Sessions are typically 2–3 hours in duration, in-person, with a maximum of 20 participants.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (b) The Platform will notify the Practitioner of session requests and confirm availability before any commitment is made. The Practitioner is never obligated to accept a session.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (c) Sessions are typically confirmed 1–2 weeks in advance.
            </p>

            {/* Clause 3 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              3. REVENUE SHARING &amp; PER-SESSION CONFIRMATION
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The Practitioner will receive a payout for each session they confirm and deliver, as detailed in a Per-Session Confirmation issued by the Platform before every session.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (a) Before each session is confirmed, the Platform will issue a Per-Session Confirmation setting out: session date and timing, module, number of participants, audience type, confirmed payout amount, TDS applicability, net payout, and expected payment date. The session is not confirmed until the Practitioner provides digital consent.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (b) The Practitioner&apos;s payout per session is determined by the Platform based on the topic, number of participants, and type of audience. The Platform does not disclose total session fees or its own margin.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (c) Payment will be made within 7 working days of the session date, subject to successful completion.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (d) There are no upfront fees, listing fees, or registration charges payable by the Practitioner to the Platform.
            </p>

            {/* Clause 4 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              4. IDENTITY, PRIVACY &amp; DISCLOSURE
            </p>
            {/* Gap 24: ag-highlight borderRadius '0 6px 6px 0', padding '0.75rem 1rem' */}
            <div
              style={{
                background: "#f5e9c8",
                borderLeft: "3px solid #c9982a",
                borderRadius: "0 6px 6px 0",
                padding: "0.75rem 1rem",
                fontSize: 13,
                color: "#8a6510",
                lineHeight: 1.65,
                margin: "1rem 0",
              }}
            >
              Disclosure operates at two tiers. <strong>Public anonymity (absolute):</strong> The Practitioner&apos;s full name, employer, and personal contact details are never published publicly. <strong>Operational disclosure (upon session confirmation, with consent):</strong> Once a session is confirmed, the session organiser receives the Practitioner&apos;s first name, current employer, domain, and years of experience. All coordination goes through iqcommune — not the Practitioner&apos;s personal contact.
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, paddingLeft: "1.25rem", marginBottom: "0.4rem" }}>
              (f) The Practitioner is solely responsible for determining whether their employer&apos;s policies permit this engagement. The Platform does not require employer disclosure.
            </p>

            {/* Clause 4A */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              4A. PAYMENT &amp; BILLING PREFERENCES
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              Revenue share payments will be made to the account details provided during onboarding. If the Practitioner elects payment to a family member, a signed declaration is required and tax invoices will be generated in the family member&apos;s name. The Practitioner remains solely responsible for all tax obligations regardless of the payment recipient.
            </p>

            {/* Clause 5 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              5. CONDUCT DURING SESSIONS
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The session environment must remain strictly educational and product-neutral. During sessions the Practitioner will not actively promote or cross-sell any financial product, fund, scheme, or instrument. The Practitioner will not collect attendee contact details in bulk. The Practitioner may share their own contact details or business card with attendees at their own discretion.
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              These restrictions apply only within the session. Breach of the in-session restrictions is grounds for immediate termination.
            </p>

            {/* Clause 6 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              6. POST-SESSION CONDUCT
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              iqcommune cannot and does not seek to control interactions between the Practitioner and session participants after a session concludes. Any professional or commercial arrangement that arises after a session is entirely between those two parties. iqcommune has no role, no liability, and places no restriction on such interactions. The Practitioner may not represent themselves as acting on behalf of iqcommune in any post-session commercial engagement.
            </p>

            {/* Clause 7 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              7. CONFIDENTIALITY
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              Each Party agrees to keep confidential any non-public information disclosed by the other Party, including participant details, session pricing, and internal platform operations. This obligation survives termination for two (2) years.
            </p>

            {/* Clause 8 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              8. CONFLICT OF INTEREST
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The Practitioner agrees to disclose to the Platform any circumstance that may constitute a conflict of interest prior to accepting a session. The Platform reserves the right to reassign the session in such cases.
            </p>

            {/* Clause 9 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              9. INTELLECTUAL PROPERTY
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              Teaching material and frameworks the Practitioner uses remain their own intellectual property. The Platform makes no claim over it. The iqcommune brand and name may not be used by the Practitioner in any public communication without prior written approval.
            </p>

            {/* Clause 10 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              10. TERM &amp; TERMINATION
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              This Agreement begins on the date signed below and continues until terminated by either Party with 14 days&apos; written notice. The Platform may terminate immediately for breach of Clause 5 (Conduct During Sessions) or Clause 7 (Confidentiality). Revenue share for sessions already conducted remains payable upon termination.
            </p>

            {/* Clause 11 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              11. LIMITATION OF LIABILITY
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              The Platform is not liable for loss of income from session cancellation or low demand. Session frequency is demand-driven and not guaranteed. The Practitioner is solely responsible for the accuracy of content shared during sessions.
            </p>

            {/* Clause 12 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              12. GOVERNING LAW &amp; DISPUTES
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              This Agreement is governed by the laws of India. Disputes will first be resolved through mutual discussion. If unresolved within 30 days, the matter will be referred to arbitration under the Arbitration and Conciliation Act, 1996.
            </p>

            {/* Clause 13 */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 24,
                marginBottom: 8,
              }}
            >
              13. ENTIRE AGREEMENT
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 8 }}>
              This Agreement, together with any written Per-Session Confirmation, constitutes the entire agreement between the Parties. Amendments require written consent from both Parties.
            </p>

            {/* Divider */}
            <hr
              style={{
                border: "none",
                borderTop: "1px solid rgba(20,18,12,0.10)",
                margin: "20px 0",
              }}
            />

            {/* Gap 25: ag-end fontSize 13 */}
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-faint)",
                textAlign: "center",
                marginTop: "1.5rem",
                fontStyle: "italic",
              }}
            >
              — End of Agreement — &nbsp;·&nbsp; iqcommune (InvestQ Commune) &nbsp;·&nbsp; hello@iqcommune.com
            </p>
          </div>
        </div>

        {/* ── SCROLL GATE STATUS BOX ── */}
        {/* Gap 26: locked-state text color var(--ink-soft) (ink-muted); Gap 27: icons width/height 15 */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: hasScrolled ? "#eef7ee" : "#f8f7f4",
            border: `1px solid ${hasScrolled ? "var(--green-border)" : "rgba(20,18,12,0.10)"}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "background 0.3s, border-color 0.3s",
            marginBottom: "1.25rem",
            fontSize: 13,
          }}
        >
          {hasScrolled ? (
            <svg
              width={15}
              height={15}
              fill="none"
              stroke="#2a6b2a"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width={15}
              height={15}
              fill="none"
              stroke="var(--ink-faint)"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          )}
          <span
            style={{
              color: hasScrolled ? "#2a6b2a" : "var(--ink-soft)",
              fontWeight: hasScrolled ? 500 : 400,
            }}
          >
            {hasScrolled
              ? "You’ve read the full agreement. Please complete your signature below."
              : "Please scroll through and read the full agreement above before you can proceed to sign."}
          </span>
        </div>

        {/* ── SIGNATURE SECTION (revealed after full scroll) ── */}
        {/* Gap 28: sign section wrapper — borderRadius 12, padding 2rem, NO h3 heading */}
        {hasScrolled && (
          <form onSubmit={handleFormSubmit} noValidate>
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(20,18,12,0.10)",
                borderRadius: 12,
                padding: "2rem",
              }}
            >
              {/* Gap 29: declaration-box — full border, borderRadius 12, no left-accent override */}
              {/* Gap 30: declaration-title color #8a6510, fontSize 14, marginBottom 12 */}
              <div
                style={{
                  background: "#f5e9c8",
                  border: "1.5px solid var(--gold-border)",
                  borderRadius: 12,
                  padding: "1.25rem 1.5rem",
                  marginBottom: "1.25rem",
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: "#8a6510", marginBottom: 12 }}>
                  By signing below, you confirm that:
                </p>
                <ul
                  style={{
                    paddingLeft: "1rem",
                    fontSize: 13,
                    color: "#8a6510",
                    lineHeight: 1.7,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <li>You have read and understood the full Practitioner Empanelment Agreement above.</li>
                  <li>You agree to the terms as stated, including Clause 5 (in-session conduct) and Clause 4 (disclosure tiers).</li>
                  <li>You confirm that your details shown above are accurate.</li>
                  <li>You understand this agreement is legally binding and digitally timestamped.</li>
                  <li>This digital signature has the same legal standing as a physical signature under the Information Technology Act, 2000.</li>
                </ul>
              </div>

              {/* Gap 31: label "Full name (as it should appear on the agreement)" */}
              {/* Gap 34: inputStyle border 1.5px solid rgba(20,18,12,0.20), padding 11px 14px */}
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}
              >
                <div>
                  <label htmlFor="sig-fullname" style={labelStyle}>
                    Full name (as it should appear on the agreement)
                  </label>
                  {/* Gap 32: placeholder "Your full legal name" */}
                  <input
                    {...register("fullName")}
                    id="sig-fullname"
                    style={inputStyle}
                    placeholder="Your full legal name"
                  />
                  {errors.fullName && (
                    <p style={errStyle} role="alert">{errors.fullName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="sig-designation" style={labelStyle}>
                    Designation
                  </label>
                  {/* Gap 33: placeholder "e.g. Equity Analyst" */}
                  <input
                    {...register("designation")}
                    id="sig-designation"
                    style={inputStyle}
                    placeholder="e.g. Equity Analyst"
                  />
                  {errors.designation && (
                    <p style={errStyle} role="alert">{errors.designation.message}</p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>As per your current employment.</p>
                </div>
              </div>

              {/* Signature pad */}
              <div style={{ marginBottom: "1rem" }}>
                {/* Gap 35: sig-label "Your signature" above the tabs */}
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 8 }}>
                  Your signature
                </p>
                {/* Gap 36: sig tabs borderRadius 100 */}
                <div style={{ display: "flex", gap: 6, marginBottom: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setSigMode("drawn")}
                    aria-pressed={sigMode === "drawn"}
                    style={tabBtn(sigMode === "drawn")}
                  >
                    Draw signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigMode("typed")}
                    aria-pressed={sigMode === "typed"}
                    style={tabBtn(sigMode === "typed")}
                  >
                    Type signature
                  </button>
                </div>

                {/* ── SIGNATURE PAD ── */}
                {sigMode === "drawn" ? (
                  <div>
                    {/* Gap 37: canvas wrapper border solid (not dashed), background #f8f7f4 */}
                    <div
                      style={{
                        border: "1.5px solid rgba(20,18,12,0.20)",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#f8f7f4",
                        position: "relative",
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        role="img"
                        aria-label="Signature drawing area — draw your signature here"
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
                        <div
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#c4c5cc",
                            fontSize: 13,
                            pointerEvents: "none",
                          }}
                        >
                          Draw your signature here
                        </div>
                      )}
                      {hasSig && (
                        <button
                          type="button"
                          onClick={clearCanvas}
                          aria-label="Clear drawn signature"
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--ink-faint)",
                            background: "#fff",
                            border: "1px solid rgba(20,18,12,0.20)",
                            borderRadius: 100,
                            padding: "3px 10px",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "color 0.15s",
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Gap 39: typed sig — preview in Georgia 28px with borderBottom, input is DM Sans 14px */
                  <div
                    style={{
                      border: "1.5px solid rgba(20,18,12,0.20)",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#f8f7f4",
                    }}
                  >
                    <div style={{ padding: "0.75rem 1rem" }}>
                      {/* Live preview in Georgia serif 28px */}
                      <div
                        aria-hidden="true"
                        style={{
                          fontSize: 28,
                          fontWeight: 400,
                          color: typedSig ? "var(--ink)" : "#d0d1d8",
                          fontFamily: "Georgia, serif",
                          letterSpacing: "0.02em",
                          minHeight: 52,
                          borderBottom: "1.5px solid rgba(20,18,12,0.20)",
                          paddingBottom: 4,
                        }}
                      >
                        {typedSig || ""}
                      </div>
                      {/* Plain DM Sans input below */}
                      <input
                        id="sig-typed"
                        value={typedSig}
                        onChange={(e) => {
                          setTypedSig(e.target.value);
                          setValue("sigData", e.target.value);
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontFamily: "inherit",
                          fontSize: 14,
                          color: "var(--ink)",
                          marginTop: 8,
                          padding: "4px 0",
                          boxSizing: "border-box" as const,
                        }}
                        placeholder="Type your name to generate signature"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Gap 40: label "Digital timestamp:"; Gap 41: no border; Gap 42: outer color ink-muted var(--ink-soft), SVG stroke green; Gap 43: fontSize 13 */}
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.75rem 1rem",
                  background: "#f8f7f4",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg
                    width={15}
                    height={15}
                    fill="none"
                    stroke="#2a6b2a"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {liveTs && (
                    <span>
                      Digital timestamp: &nbsp;<span style={{ fontWeight: 500, color: "var(--ink)" }}>{liveTs}</span>
                    </span>
                  )}
                </div>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-faint)" }}>Auto-captured at submission</span>
              </div>

              {/* Hidden fields — HMAC verification pass-through */}
              <input type="hidden" {...register("ref")} value={refCode} />
              <input type="hidden" {...register("sigMode")} value={sigMode} />
              <input type="hidden" {...register("sigData")} />
              <input type="hidden" {...register("linkSig")} />
              <input type="hidden" {...register("linkParams.name")} />
              <input type="hidden" {...register("linkParams.role")} />
              <input type="hidden" {...register("linkParams.org")} />
              <input type="hidden" {...register("linkParams.module")} />
              <input type="hidden" {...register("linkParams.city")} />
              <input type="hidden" {...register("linkParams.ref")} />
              <input type="hidden" {...register("linkParams.email")} />

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
                    marginTop: 12,
                  }}
                >
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "15px",
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 100,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.35 : 1,
                  fontFamily: "inherit",
                  transition: "opacity 0.18s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {/* Gap 44: keep "Signing…" loading state — better UX, no strict parity required */}
                {isSubmitting ? (
                  "Signing…"
                ) : (
                  <>
                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    I agree — sign &amp; complete onboarding
                  </>
                )}
              </button>

              {/* Gap 45: only ONE sign-fine paragraph — remove the second IT Act paragraph */}
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ink-faint)",
                  textAlign: "center",
                  marginTop: "0.75rem",
                } as React.CSSProperties}
              >
                This action is irreversible. A copy of the signed agreement will be sent to your registered email.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const checkCircle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "#eef7ee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 1.5rem",
  color: "#2a6b2a",
};

// Gap 34: border 1.5px solid rgba(20,18,12,0.20), padding 11px 14px
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid rgba(20,18,12,0.20)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  boxSizing: "border-box",
  outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  display: "block",
  marginBottom: 5,
  color: "var(--ink)",
};
const errStyle: React.CSSProperties = { fontSize: 12, color: "#a32d2d", marginTop: 4 };

// Gap 36: borderRadius 100 (pill-shaped tabs)
function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "6px 16px",
    borderRadius: 100,
    border: active ? "1.5px solid var(--ink)" : "1.5px solid rgba(20,18,12,0.20)",
    background: active ? "var(--ink)" : "#fff",
    color: active ? "#fff" : "var(--ink-soft)",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 500,
    transition: "all 0.15s",
  };
}
