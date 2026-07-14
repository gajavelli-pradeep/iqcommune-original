"use client";
import { useCallback, useState } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10_000_000) return "₹" + (n / 10_000_000).toFixed(1) + "Cr";
  if (n >= 100_000) return "₹" + (n / 100_000).toFixed(1) + "L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(0) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ── Sub-components ────────────────────────────────────────────────────────────

const WIDGET_BG = "rgba(0,0,0,0.25)";
const WIDGET_BOR = "1px solid rgba(201,152,42,0.18)";
const LBL_COLOR = "rgba(255,255,255,0.4)";
const VAL_COLOR = "rgba(255,255,255,0.9)";
const BOX_BG = "rgba(0,0,0,0.3)";
const BOX_LBL_C = "rgba(255,255,255,0.3)";

function WidgetHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: "9px 13px",
        borderBottom: "1px solid rgba(201,152,42,0.12)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 500, color: VAL_COLOR }}>
        {title}
      </span>
      <span
        style={{
          fontSize: 9,
          padding: "2px 7px",
          borderRadius: 20,
          background: "rgba(201,152,42,0.12)",
          color: "var(--gold)",
          border: "0.5px solid rgba(201,152,42,0.3)",
        }}
      >
        Try it
      </span>
    </div>
  );
}

function CtrlRow({
  label,
  valueStr,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueStr: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div
        style={{
          fontSize: 9.5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: LBL_COLOR,
          marginBottom: 3,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: VAL_COLOR,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {valueStr}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%",
          accentColor: "var(--gold)",
          background: "transparent",
          cursor: "pointer",
        }}
      />
    </div>
  );
}

function Box({
  label,
  value,
  cls,
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  const color =
    cls === "pos"
      ? "#4ec994"
      : cls === "neg"
        ? "#e06c75"
        : cls === "warn"
          ? "var(--gold)"
          : VAL_COLOR;
  return (
    <div style={{ background: BOX_BG, borderRadius: 5, padding: "7px 9px" }}>
      <div
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: BOX_LBL_C,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Flag({
  type,
  text,
}: {
  type: "good" | "warn" | "bad" | "none";
  text: string;
}) {
  if (!text) return null;
  const style: React.CSSProperties =
    type === "good"
      ? {
          background: "rgba(78,201,148,0.1)",
          color: "#4ec994",
          border: "0.5px solid rgba(78,201,148,0.25)",
        }
      : type === "warn"
        ? {
            background: "rgba(201,152,42,0.1)",
            color: "var(--gold)",
            border: "0.5px solid rgba(201,152,42,0.25)",
          }
        : type === "bad"
          ? {
              background: "rgba(224,108,117,0.1)",
              color: "#e06c75",
              border: "0.5px solid rgba(224,108,117,0.25)",
            }
          : {};
  return (
    <div
      style={{
        marginTop: 8,
        padding: "6px 9px",
        borderRadius: 5,
        fontSize: 11,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {text}
    </div>
  );
}

// ── Tool 1: 50/30/20 Budget Checker ──────────────────────────────────────────

function BudgetChecker() {
  const [income, setIncome] = useState(60000);
  const needs = income * 0.5,
    wants = income * 0.3,
    save = income * 0.2;
  const annualSave = save * 12;
  const tenYrCorpus = annualSave * (((Math.pow(1.1, 10) - 1) / 0.1) * 1.1);
  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="Budget Checker" />
      <div style={{ padding: "12px 13px" }}>
        <CtrlRow
          label="Monthly take-home"
          valueStr={fmt(income)}
          min={15000}
          max={300000}
          step={5000}
          value={income}
          onChange={setIncome}
        />
        <div
          style={{
            display: "flex",
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            gap: 1,
            marginTop: 8,
          }}
        >
          <div
            style={{ width: "50%", background: "#c9982a", height: "100%" }}
          />
          <div
            style={{ width: "30%", background: "#4a7abe", height: "100%" }}
          />
          <div
            style={{ width: "20%", background: "#4ec994", height: "100%" }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5,
            marginTop: 7,
          }}
        >
          <Box label="Needs (50%)" value={fmt(needs)} />
          <Box label="Wants (30%)" value={fmt(wants)} />
          <Box label="Savings (20%)" value={fmt(save)} cls="pos" />
        </div>
        <Flag
          type="good"
          text={`₹${Math.round(annualSave / 1000)}K/yr goes to savings — over 10 years at 10% return that compounds to ${fmt(tenYrCorpus)}.`}
        />
      </div>
    </div>
  );
}

// ── Tool 2: Retirement Corpus Calculator ────────────────────────────────────

function RetirementCorpus() {
  const [age, setAge] = useState(32);
  const [sav, setSav] = useState(20000);
  const yearsLeft = 60 - age;
  const monthlyExpense = sav * 0.7;
  const futureMonthly = monthlyExpense * Math.pow(1.06, yearsLeft);
  // Growing annuity PV — fully monthly: nm=240 months, gm=0.5%/mo, rm=0.583%/mo
  const rm = 0.07 / 12,
    gm = 0.06 / 12,
    nm = 20 * 12;
  const corpus =
    (futureMonthly * (1 - Math.pow((1 + gm) / (1 + rm), nm))) / (rm - gm);
  const r = 0.12 / 12,
    n = yearsLeft * 12;
  const sipNeeded = (corpus * r) / (Math.pow(1 + r, n) - 1);
  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="Retirement Corpus" />
      <div style={{ padding: "12px 13px" }}>
        <CtrlRow
          label="Current age"
          valueStr={String(age)}
          min={22}
          max={55}
          step={1}
          value={age}
          onChange={(v) => setAge(Math.round(v))}
        />
        <CtrlRow
          label="Monthly savings"
          valueStr={fmt(sav)}
          min={5000}
          max={150000}
          step={5000}
          value={sav}
          onChange={setSav}
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}
        >
          <Box label="Corpus needed" value={fmt(corpus)} cls="warn" />
          <Box label="SIP required" value={fmt(sipNeeded)} cls="pos" />
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.5,
            marginTop: 8,
          }}
        >
          {yearsLeft} years to retirement. Assumed 6% inflation, 7%
          withdrawal-phase return, 20-year retirement window.
        </div>
      </div>
    </div>
  );
}

// ── Tool 3: P/E Valuation Quick-Check ────────────────────────────────────────

function PEValuation() {
  const [price, setPrice] = useState(450);
  const [eps, setEps] = useState(22);
  const pe = eps > 0 ? price / eps : null;
  const verdict =
    pe === null ? null : pe < 15 ? "Cheap" : pe <= 28 ? "Fair" : "Stretched";
  const vType =
    pe === null ? "none" : pe < 15 ? "good" : pe <= 28 ? "warn" : "bad";
  const vColor =
    pe === null
      ? VAL_COLOR
      : pe < 15
        ? "#4ec994"
        : pe <= 28
          ? "var(--gold)"
          : "#e06c75";
  const flagText =
    pe === null
      ? ""
      : pe < 15
        ? `P/E of ${pe.toFixed(1)}× is below 15 — trading at a discount to the market. Worth investigating why.`
        : pe <= 28
          ? `P/E of ${pe.toFixed(1)}× is in line with market. Valuation is not the edge here — earnings quality is.`
          : `P/E of ${pe.toFixed(1)}× is above 28 — priced for significant growth. Any miss will be punished.`;
  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="Valuation Check" />
      <div style={{ padding: "12px 13px" }}>
        <CtrlRow
          label="Market price (₹)"
          valueStr={`₹${price.toLocaleString("en-IN")}`}
          min={10}
          max={5000}
          step={10}
          value={price}
          onChange={(v) => setPrice(Math.round(v))}
        />
        <CtrlRow
          label="EPS (₹)"
          valueStr={`₹${eps}`}
          min={1}
          max={500}
          step={1}
          value={eps}
          onChange={(v) => setEps(Math.round(v))}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5,
          }}
        >
          <Box
            label="P/E Ratio"
            value={pe !== null ? pe.toFixed(1) + "×" : "N/A"}
          />
          <Box label="Market avg" value="22×" />
          <div
            style={{ background: BOX_BG, borderRadius: 5, padding: "7px 9px" }}
          >
            <div
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: BOX_LBL_C,
                marginBottom: 2,
              }}
            >
              Verdict
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: vColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {verdict ?? "—"}
            </div>
          </div>
        </div>
        <Flag
          type={vType as "good" | "warn" | "bad" | "none"}
          text={flagText}
        />
      </div>
    </div>
  );
}

// ── Tool 4: Post-Tax Return Comparator ────────────────────────────────────────

function DebtComparator() {
  const [amt, setAmt] = useState(100000);
  const [yrs, setYrs] = useState(3);
  const tax = 0.3;
  const fdNet = amt + amt * (Math.pow(1.069, yrs) - 1) * (1 - tax);
  const mfNet = amt + amt * (Math.pow(1.077, yrs) - 1) * (1 - tax);
  const gsNet = amt + amt * (Math.pow(1.073, yrs) - 1) * (1 - tax);
  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="Debt Comparator" />
      <div style={{ padding: "12px 13px" }}>
        <CtrlRow
          label="Amount (₹)"
          valueStr={fmt(amt)}
          min={10000}
          max={1000000}
          step={10000}
          value={amt}
          onChange={setAmt}
        />
        <CtrlRow
          label="Tenure (years)"
          valueStr={`${yrs} yr${yrs > 1 ? "s" : ""}`}
          min={1}
          max={10}
          step={1}
          value={yrs}
          onChange={(v) => setYrs(Math.round(v))}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5,
          }}
        >
          <Box label="FD (post-tax)" value={fmt(fdNet)} />
          <Box label="Debt Fund" value={fmt(mfNet)} cls="pos" />
          <Box label="G-Sec" value={fmt(gsNet)} cls="pos" />
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.5,
            marginTop: 8,
          }}
        >
          Assumes 30% tax slab. Illustrative only — actual returns vary with
          rate cycles and tax slab.
        </div>
      </div>
    </div>
  );
}

// ── Tool 5: Portfolio Balance Scorecard ───────────────────────────────────────

const T5_PROFILES = [
  { eq: 30, de: 55, label: "Conservative" },
  { eq: 55, de: 35, label: "Moderate" },
  { eq: 75, de: 18, label: "Aggressive" },
];

function PortfolioScorecard() {
  const [profile, setProfile] = useState(0);
  const [eq, setEq] = useState(T5_PROFILES[0].eq);
  const [de, setDe] = useState(T5_PROFILES[0].de);

  const handleProfile = useCallback((p: number) => {
    setProfile(p);
    setEq(T5_PROFILES[p].eq);
    setDe(T5_PROFILES[p].de);
  }, []);

  const rest = Math.max(0, 100 - eq - de);
  const tgt = T5_PROFILES[profile];
  const rawScore = Math.max(
    0,
    10 - (Math.abs(eq - tgt.eq) + Math.abs(de - tgt.de)) / 5,
  );
  const score = Math.round(rawScore * 10) / 10;
  const scoreType = score >= 8 ? "pos" : score >= 5 ? "warn" : "neg";
  const flagType: "good" | "warn" | "bad" =
    score >= 8 ? "good" : score >= 5 ? "warn" : "bad";
  const flagText =
    score >= 8
      ? `Well-balanced for ${tgt.label === "Aggressive" ? "an" : "a"} ${tgt.label} profile. No rebalancing needed right now.`
      : score >= 5
        ? `Slightly off-target for ${tgt.label}. Target: ~${tgt.eq}% equity, ~${tgt.de}% debt.`
        : `Significant drift from ${tgt.label} targets. Rebalance toward ${tgt.eq}% equity, ${tgt.de}% debt.`;

  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="Portfolio Scorecard" />
      <div style={{ padding: "12px 13px" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
          {T5_PROFILES.map((p, i) => (
            <button
              key={p.label}
              onClick={() => handleProfile(i)}
              style={{
                fontSize: 10,
                padding: "3px 9px",
                borderRadius: 20,
                cursor: "pointer",
                border: `0.5px solid ${i === profile ? "rgba(201,152,42,0.5)" : "rgba(201,152,42,0.2)"}`,
                color: i === profile ? "var(--gold)" : "rgba(255,255,255,0.4)",
                background:
                  i === profile ? "rgba(201,152,42,0.08)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <CtrlRow
          label="Equity %"
          valueStr={`${eq}%`}
          min={0}
          max={100}
          step={5}
          value={eq}
          onChange={(v) => setEq(Math.round(v))}
        />
        <CtrlRow
          label="Debt %"
          valueStr={`${de}%`}
          min={0}
          max={100}
          step={5}
          value={de}
          onChange={(v) => setDe(Math.round(v))}
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}
        >
          <Box
            label="Balance score"
            value={`${score.toFixed(1)}/10`}
            cls={scoreType}
          />
          <Box label="Gold + Cash" value={`${rest}%`} />
        </div>
        <Flag type={flagType} text={flagText} />
      </div>
    </div>
  );
}

// ── Tool 6: SIP Growth Visualiser ────────────────────────────────────────────

function SipVisualiser() {
  const [sip, setSip] = useState(10000);
  const [yrs, setYrs] = useState(15);
  const [ret, setRet] = useState(12);
  const r = ret / 100 / 12,
    n = yrs * 12;
  const corpus = sip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = sip * n;
  const gains = corpus - invested;

  const steps = Math.min(yrs, 10);
  const bars: { h: number; isLast: boolean }[] = [];
  let maxVal = 0;
  const vals: number[] = [];
  for (let y = 1; y <= steps; y++) {
    const ny = Math.round((y * yrs) / steps) * 12;
    const c = sip * ((Math.pow(1 + r, ny) - 1) / r) * (1 + r);
    vals.push(c);
    if (c > maxVal) maxVal = c;
  }
  vals.forEach((v, i) =>
    bars.push({
      h: Math.max(4, Math.round((v / maxVal) * 36)),
      isLast: i === vals.length - 1,
    }),
  );

  return (
    <div
      style={{
        background: WIDGET_BG,
        border: WIDGET_BOR,
        borderRadius: 8,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <WidgetHeader title="SIP Growth" />
      <div style={{ padding: "12px 13px" }}>
        <CtrlRow
          label="Monthly SIP"
          valueStr={fmt(sip)}
          min={1000}
          max={100000}
          step={1000}
          value={sip}
          onChange={setSip}
        />
        <CtrlRow
          label="Years"
          valueStr={String(yrs)}
          min={3}
          max={30}
          step={1}
          value={yrs}
          onChange={(v) => setYrs(Math.round(v))}
        />
        <CtrlRow
          label="Return %"
          valueStr={`${ret}%`}
          min={6}
          max={18}
          step={0.5}
          value={ret}
          onChange={setRet}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5,
          }}
        >
          <Box label="Invested" value={fmt(invested)} />
          <Box label="Corpus" value={fmt(corpus)} cls="pos" />
          <Box label="Gains" value={fmt(gains)} cls="pos" />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 40,
            marginTop: 8,
          }}
        >
          {bars.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: b.h,
                borderRadius: "2px 2px 0 0",
                background: b.isLast ? "#c9982a" : "rgba(201,152,42,0.35)",
                minHeight: 3,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tool card wrapper ─────────────────────────────────────────────────────────

const TOOLS_DATA = [
  {
    module: "Foundations of Personal Finance",
    name: "50/30/20 Budget Checker",
    desc: "Enter your monthly take-home. See instantly how your spending maps against the 50/30/20 benchmark.",
    Widget: BudgetChecker,
  },
  {
    module: "Retirement & Goal-Based Planning",
    name: "Retirement Corpus Calculator",
    desc: "Your age, monthly savings, and inflation. We calculate what you need at retirement and the SIP to get there.",
    Widget: RetirementCorpus,
  },
  {
    module: "Equity Investing Simplified",
    name: "P/E Valuation Quick-Check",
    desc: "Enter a stock's market price and EPS. Instant P/E verdict against the broad market benchmark.",
    Widget: PEValuation,
  },
  {
    module: "Debt & Fixed Income Investing",
    name: "Post-Tax Return Comparator",
    desc: "FD vs. debt fund vs. G-Sec. Enter amount and tenure — see post-tax returns side by side.",
    Widget: DebtComparator,
  },
  {
    module: "Asset Allocation & Portfolio Construction",
    name: "Portfolio Balance Scorecard",
    desc: "Enter your asset mix. Get a live balance score and rebalancing cue for your risk profile.",
    Widget: PortfolioScorecard,
  },
  {
    module: "Investment Solutions & Portfolio Strategies",
    name: "SIP Growth Visualiser",
    desc: "Monthly SIP + years + return rate. Watch your corpus build year by year.",
    Widget: SipVisualiser,
  },
] as const;

// ── Main export ───────────────────────────────────────────────────────────────

export function ToolsSection() {
  return (
    <section style={{ background: "#14161d", padding: "4rem 2rem" }}>
      <style>{`.tool-card:hover { background: rgba(255,255,255,0.09) !important; border-color: rgba(201,152,42,0.4) !important; }`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section pill */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold-on-ink)",
              background: "rgba(201,152,42,0.15)",
              border: "1px solid rgba(201,152,42,0.3)",
              padding: "5px 14px",
              borderRadius: 100,
            }}
          >
            Tools &amp; Calculators
          </span>
        </div>

        <h2
          style={{
            fontSize: "clamp(26px,3.8vw,40px)",
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            textAlign: "center",
            color: "#ffffff",
            marginBottom: "1rem",
          }}
        >
          Try the numbers before you attend.
        </h2>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto 3rem",
          }}
        >
          Six live calculators — one per module. Built on the same frameworks
          the sessions use. No sign-up, no data stored.
        </p>

        <div
          className="tools-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginTop: "2rem",
          }}
        >
          {TOOLS_DATA.map(({ module, name, desc, Widget }) => (
            <div
              key={name}
              className="tool-card"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                transition: "background 0.2s, border-color 0.2s",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {module}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#fff",
                    marginBottom: 4,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.45)",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </div>
              </div>
              <Widget />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
