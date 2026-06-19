import type { Metadata } from "next";
import { RequestModal } from "@/components/public/RequestModal";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { NavBar } from "@/components/public/NavBar";

export const metadata: Metadata = {
  title: { absolute: "iqcommune — Real practitioners. Real sessions." },
  description: "In-person finance sessions led by active practitioners. No products. No pitch. Just knowledge.",
  openGraph: {
    title: "iqcommune — Real practitioners. Real sessions.",
    description: "In-person finance sessions led by active practitioners. No products. No pitch.",
    type: "website",
    siteName: "iqcommune",
  },
  twitter: {
    card: "summary",
    title: "iqcommune — Real practitioners. Real sessions.",
    description: "In-person finance sessions led by active practitioners. No products. No pitch.",
  },
};

// ── Static data ───────────────────────────────────────────────────────────────

const POOL_STATS = [
  { num: "12+", label: "Years avg. experience" },
  { num: "20+", label: "Active practitioners" },
  { num: "6",   label: "Specialisations" },
] as const;

const POOL_ROLES = [
  {
    title: "Equity Analysts",
    sub: "At brokerages & research desks",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Portfolio Managers",
    sub: "Active at AMCs & wealth firms",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    title: "Certified Financial Planners",
    sub: "SEBI-registered, currently practising",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Wealth Advisors",
    sub: "Serving HNI clients day-to-day",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
] as const;

// Gap 5: trust bar items with their specific icons (group, pin, group)
const TRUST_ITEMS = [
  {
    text: "All practitioners currently active in that specific domain",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: 0.65, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    text: "In-person sessions only — not online",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: 0.65, flexShrink: 0 }}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    text: "Max 20 participants per session",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ opacity: 0.65, flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
] as const;

const RIBBON_ITEMS = [
  {
    label: "Groups",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Organisations & Institutions",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    label: "AMCs & Wealth Management Firms",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
] as const;

const DIFF_THEM = [
  "Instructors who left the industry years ago",
  "Curriculum based on past market conditions",
  "Generic examples from outdated textbooks",
  "No skin in the game — not investing their own money",
  "Fixed content, repeated every batch",
] as const;

const DIFF_US = [
  "Currently working in finance — every single day",
  "Teaching with live market examples from this week",
  "Real decisions, real portfolios, real consequences",
  "They manage money the same way they teach you to",
  "Sessions adapt to current events — no stale content",
] as const;

const TOPICS = [
  {
    name: "Financial Planning Basics",
    desc: "Budgeting, net worth, emergency funds — the foundation every adult needs before investing a single rupee.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: "Investment Basics",
    desc: "Mutual funds, SIPs, equity vs. debt — explained by someone actively allocating money across these instruments.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: "Market Fundamentals",
    desc: "How markets work, what moves them, and how to read signals — from analysts watching live order books.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    name: "Stock Market Basics",
    desc: "Reading price charts, P/E ratios, earnings reports — concepts that most trainers only read about.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    name: "Retirement Planning",
    desc: "NPS, PPF, EPF, annuities — building a retirement corpus that actually keeps pace with inflation.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "Goal-Based Investing",
    desc: "Structuring investments around real goals — a house, children's education, business capital — with timelines that work.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="#c9982a" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
] as const;

const AUDIENCE_CARDS = [
  {
    heading: "Groups",
    desc: "Register as the SPOC (primary contact) on behalf of your group. You coordinate with us — we handle everything else.",
    tags: [
      "Friends & Family",
      "Colleagues",
      "Residential Communities",
      "Walking & Interest Groups",
      "Study Circles",
    ],
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    heading: "Organisations & Institutions",
    desc: "Any organisation looking to upskill its people on financial literacy — tailored to your workforce and context.",
    tags: [
      "Corporates",
      "Educational Institutions",
      "Hospitals",
      "Media & Production",
    ],
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    heading: "AMCs & Wealth Firms",
    desc: "Client education or new-joiner onboarding — led by practitioners from within the same industry.",
    tags: [
      "Client Education",
      "New Joiner Onboarding",
      "RM & Advisor Upskilling",
      "Investor Awareness Events",
    ],
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
] as const;

const HOW_STEPS = [
  {
    num: "1",
    title: "Pick a topic",
    desc: "Choose the area that fits your need — or let us guide you if you're unsure where to start.",
  },
  {
    num: "2",
    title: "Send your request",
    desc: "Share your audience type, group size (up to 20), and a preferred date window. We take it from there.",
  },
  {
    num: "3",
    title: "We get in touch",
    desc: "Our team reaches out to confirm details, align the right practitioner, and finalise the venue with you.",
  },
  {
    num: "4",
    title: "Attend Session",
    desc: "In-person, focused session — max 20 people — led by a practitioner still active in that field.",
  },
] as const;

const WALKOUT_CARDS = [
  {
    title: "Financial Planning Basics",
    bullets: [
      "A personal budget framework mapped to your actual income and expenses",
      "A net worth snapshot and a clear step to improve it within 30 days",
      "Emergency fund target calculated for your specific situation",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Investment Basics",
    bullets: [
      "A starter allocation plan — how to split your investable surplus across instruments",
      "A checklist to evaluate any mutual fund or SIP before committing",
      "Clarity on what to avoid — common mistakes that cost retail investors the most",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Market Fundamentals",
    bullets: [
      "A framework to read market movements without getting swept up in media noise",
      "A personal “signal vs noise” filter for RBI decisions, earnings, and macro events",
      "Confidence to have an informed view — not just follow a tip",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Stock Market Basics",
    bullets: [
      "A personal stock evaluation template — P/E, growth, moat, and red flags",
      "How to read an earnings report in under 10 minutes",
      "A watchlist-building approach you can apply immediately",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Retirement Planning",
    bullets: [
      "Your personal retirement corpus number — calculated with real inflation assumptions",
      "A NPS/PPF/EPF contribution plan mapped to your timeline",
      "The one lever most people miss that makes the biggest difference post-60",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Goal-Based Investing",
    bullets: [
      "A goal-bucket plan — each goal mapped to a timeline and an instrument",
      "Monthly SIP amounts needed per goal — calculated in the room, for your numbers",
      "A review trigger system so you know when — and only when — to revisit the plan",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
] as const;


const TOOLS = [
  {
    module: "Financial Planning Basics",
    name: "50/30/20 Budget Calculator",
    desc: "Enter your monthly take-home and instantly see how your spending maps against a healthy allocation framework.",
  },
  {
    module: "Financial Planning Basics",
    name: "Net Worth Tracker",
    desc: "A simple asset vs. liability sheet that calculates your real net worth and highlights where to focus first.",
  },
  {
    module: "Investment Basics",
    name: "SIP Growth Calculator",
    desc: "See how a monthly SIP compounds over 5, 10, and 20 years at realistic return assumptions — not marketing numbers.",
  },
  {
    module: "Stock Market Basics",
    name: "P/E & Valuation Quick-Check",
    desc: "Enter a stock's basic numbers and get a sense of whether it's reasonably priced — without needing a Bloomberg terminal.",
  },
  {
    module: "Retirement Planning",
    name: "Retirement Corpus Estimator",
    desc: "Calculate how much you need at retirement given your current age, lifestyle cost, and inflation rate — with a monthly savings target.",
  },
  {
    module: "Goal-Based Investing",
    name: "Goal-to-SIP Planner",
    desc: "Enter your goal (amount + timeline) and get the monthly investment needed — broken down by instrument type and risk profile.",
  },
] as const;

const CTA_REASSURANCE = [
  "No fixed slots — we schedule around you",
  "Max 20 participants per session",
  "We'll reach out within 2–3 working days",
] as const;

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "iqcommune",
  url: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  description:
    "In-person finance sessions led by active practitioners. No products. No pitch.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@iqcommune.com",
    contactType: "customer service",
  },
};

// ── Shared sub-components (server-side, no "use client") ─────────────────────

function Pill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
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
          color: dark ? "#f0c84a" : "#8a6510",
          background: dark ? "rgba(201,152,42,0.15)" : "#f5e9c8",
          border: `1px solid ${dark ? "rgba(201,152,42,0.3)" : "#e0c870"}`,
          padding: "5px 14px",
          borderRadius: 100,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function CheckmarkSvg({ size = 15, color = "#c9982a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossSvg() {
  return (
    <svg width="15" height="15" fill="none" stroke="#9496a1" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main style={{ background: "#ffffff", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      {/* ── §1 NAV ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-left > * { animation: fadeUp 0.5s ease both; }
        .hero-left > *:nth-child(1) { animation-delay: 0.05s; }
        .hero-left > *:nth-child(2) { animation-delay: 0.14s; }
        .hero-left > *:nth-child(3) { animation-delay: 0.23s; }
        .hero-left > *:nth-child(4) { animation-delay: 0.32s; }
        .hero-card-anim { animation: fadeUp 0.55s 0.3s ease both; }
        .hero-inner {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center;
        }
        @media (max-width: 720px) {
          .hero-inner { grid-template-columns: 1fr; gap: 2.5rem; }
          .hero-before { display: none; }
          .diff-grid-inner { grid-template-columns: 1fr !important; }
          .diff-col-them { display: none !important; }
          .topics-grid { grid-template-columns: 1fr 1fr !important; }
          .audience-grid { gap: 1rem !important; }
          .walkout-grid { grid-template-columns: 1fr 1fr !important; }
          .tools-grid { grid-template-columns: 1fr 1fr !important; }
          .trust-bar-inner, .ribbon-inner, .cta-reassurance { gap: 1.25rem !important; }
          .form-row-modal { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .topics-grid { grid-template-columns: 1fr !important; }
          .pool-role-grid { grid-template-columns: 1fr !important; }
          .walkout-grid { grid-template-columns: 1fr !important; }
          .tools-grid { grid-template-columns: 1fr !important; }
        }
        .topic-card:hover { border-color: #c9982a !important; transform: translateY(-3px); }
        .walkout-card:hover { transform: translateY(-3px); border-color: #c9982a !important; }
        .audience-card-inner:hover { border-color: #c9982a !important; transform: translateY(-3px); }
        .tool-card:hover { background: rgba(255,255,255,0.09) !important; border-color: rgba(201,152,42,0.4) !important; }
        .iq-animate { opacity: 0; transform: translateY(16px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .iq-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      <NavBar />

      {/* ── §2 HERO ── */}
      <section
        style={{
          background: "#f8f7f4",
          borderBottom: "1px solid rgba(15,17,23,0.10)",
          padding: "5rem 2rem 4.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          className="hero-before"
          style={{
            position: "absolute",
            top: -140,
            right: -100,
            width: 560,
            height: 560,
            background: "radial-gradient(circle, #f5e9c8 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />

        <div className="hero-inner" style={{ position: "relative" }}>
          {/* Left */}
          <div className="hero-left">
            {/* Badge */}
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#8a6510",
                  background: "#f5e9c8",
                  border: "1px solid #e0c870",
                  padding: "5px 14px",
                  borderRadius: 100,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Taught by Active Professionals
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(30px,4.2vw,48px)",
                fontWeight: 600,
                lineHeight: 1.18,
                letterSpacing: "-0.01em",
                color: "#0f1117",
                marginBottom: "1.25rem",
                marginTop: "1.5rem",
              }}
            >
              Real finance knowledge —{" "}
              <span style={{ color: "#c9982a" }}>from professionals</span> actively navigating the same markets you&apos;re trying to understand.
            </h1>

            {/* Sub */}
            <p
              style={{
                fontSize: 17,
                color: "#4a4d5c",
                maxWidth: 440,
                marginBottom: "2rem",
                lineHeight: 1.65,
              }}
            >
              You deserve to learn from someone who&apos;d stake their own money on what they teach.
            </p>

            {/* Gap 1: hero CTA uses dark ink primary button style */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <RequestModal variant="hero" />
              <span style={{ fontSize: 13, color: "#9496a1", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                We&apos;ll schedule around you
              </span>
            </div>
          </div>

          {/* Right — Practitioner pool card */}
          <div
            className="hero-card-anim"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,17,23,0.20)",
              borderRadius: 20,
              padding: "2rem",
              boxShadow: "0 12px 48px rgba(0,0,0,0.07)",
            }}
          >
            {/* Card label */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8a6510",
                marginBottom: "1.1rem",
              }}
            >
              Our practitioner pool
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {POOL_STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    textAlign: "center",
                    padding: "0.65rem 0.5rem",
                    borderRight: i < 2 ? "1px solid rgba(15,17,23,0.10)" : undefined,
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 600, color: "#0f1117", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                    {stat.num}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a4d5c", marginTop: 2, lineHeight: 1.3 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(15,17,23,0.10)", margin: "1rem 0" }} />

            {/* Role grid */}
            <div
              className="pool-role-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}
            >
              {POOL_ROLES.map((role) => (
                <div
                  key={role.title}
                  style={{ background: "#f8f7f4", borderRadius: 10, padding: "0.75rem 0.9rem" }}
                >
                  <div style={{ color: "#8a6510", marginBottom: 5 }}>{role.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f1117", marginBottom: 2 }}>
                    {role.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a4d5c", lineHeight: 1.4 }}>
                    {role.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div
              style={{
                paddingTop: "1rem",
                borderTop: "1px solid rgba(15,17,23,0.10)",
                fontSize: 12,
                color: "#9496a1",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              Every session is led by a practitioner currently active in that specific area of finance.
            </div>
          </div>
        </div>
      </section>

      {/* ── §3 TRUST BAR ── */}
      <div style={{ background: "#0f1117", color: "rgba(255,255,255,0.82)", padding: "0.9rem 2rem" }}>
        <div
          className="trust-bar-inner"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3rem",
            flexWrap: "wrap",
          }}
        >
          {/* Gap 5: each trust item now uses its specific contextual icon */}
          {TRUST_ITEMS.map((item) => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── §4 INPERSON RIBBON ── */}
      <div
        style={{
          background: "#f5e9c8",
          borderTop: "1px solid #e0c870",
          borderBottom: "1px solid #e0c870",
          padding: "0.85rem 2rem",
        }}
      >
        <div
          className="ribbon-inner"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2.5rem",
            flexWrap: "wrap",
          }}
        >
          {RIBBON_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "#8a6510" }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── §5 DIFFERENTIATOR ── */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Why it matters</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            A practitioner is not a trainer.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            The person teaching you should still be doing it. Here&apos;s why that gap changes everything.
          </p>

          {/* Comparison table */}
          <div
            className="diff-grid-inner"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: "1px solid rgba(15,17,23,0.20)",
              borderRadius: 12,
              overflow: "hidden",
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {/* Left col — Them */}
            <div className="diff-col-them">
              <div
                style={{
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#f8f7f4",
                  color: "#9496a1",
                  borderBottom: "1px solid rgba(15,17,23,0.20)",
                }}
              >
                Typical training programme
              </div>
              {DIFF_THEM.map((text, i) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < DIFF_THEM.length - 1 ? "1px solid rgba(15,17,23,0.10)" : undefined,
                    fontSize: 14,
                    color: "#4a4d5c",
                    borderRight: "1px solid rgba(15,17,23,0.20)",
                  }}
                >
                  <CrossSvg />
                  {text}
                </div>
              ))}
            </div>

            {/* Right col — Us */}
            <div>
              <div
                style={{
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "#0f1117",
                  color: "#ffffff",
                  borderBottom: "1px solid rgba(15,17,23,0.20)",
                }}
              >
                iqcommune — Active Practitioners
              </div>
              {DIFF_US.map((text, i) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < DIFF_US.length - 1 ? "1px solid rgba(15,17,23,0.10)" : undefined,
                    fontSize: 14,
                    color: "#0f1117",
                    fontWeight: 500,
                  }}
                >
                  <CheckmarkSvg color="#c9982a" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §6 TOPICS ── */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Training Topics</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            What you&apos;ll learn.
          </h2>
          {/* Gap 6 & 24: section-sub margin-bottom matches source 3rem */}
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            Six focused modules — each led by a practitioner actively working in that specific area.
          </p>

          <div
            className="topics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {TOPICS.map((topic) => (
              <div
                key={topic.name}
                className="topic-card iq-animate"
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15,17,23,0.10)",
                  borderRadius: 12,
                  padding: "1.5rem",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#f5e9c8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  {topic.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f1117", marginBottom: 4 }}>
                  {topic.name}
                </div>
                <div style={{ fontSize: 13, color: "#4a4d5c", lineHeight: 1.55 }}>
                  {topic.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §7 AUDIENCE ── */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Who is this for</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            Built for anyone serious<br />about financial literacy.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            Whether it&apos;s a group of friends, a corporate team, or a firm looking to upskill — we design the session around your audience.
          </p>

          <div
            className="audience-grid"
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {AUDIENCE_CARDS.map((card) => (
              <div
                key={card.heading}
                className="audience-card-inner"
                style={{
                  background: "#f8f7f4",
                  border: "1.5px solid rgba(15,17,23,0.10)",
                  borderRadius: 12,
                  padding: "1.6rem 1.75rem",
                  flex: "1 1 210px",
                  maxWidth: 240,
                  transition: "border-color 0.2s, transform 0.2s",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#f5e9c8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    color: "#8a6510",
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f1117", marginBottom: 5 }}>
                  {card.heading}
                </div>
                <div style={{ fontSize: 13, color: "#4a4d5c", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                  {card.desc}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#8a6510",
                        background: "#f5e9c8",
                        border: "1px solid #e0c870",
                        padding: "3px 9px",
                        borderRadius: 100,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Gap 7: footnote has SVG icon, font-size 12, margin-top 1.75rem */}
          <p
            style={{
              fontSize: 12,
              color: "#9496a1",
              textAlign: "center",
              marginTop: "1.75rem",
              lineHeight: 1.5,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: 5, marginTop: -2 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            All sessions capped at 20 participants — to keep the quality of conversation and interaction high.
          </p>
        </div>
      </section>

      {/* ── §8 HOW IT WORKS ── */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Process</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            How it works.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            Tell us what you need. We align the right practitioner and schedule around you.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "2rem",
              maxWidth: 960,
              margin: "0 auto",
            }}
          >
            {HOW_STEPS.map((step) => (
              <div
                key={step.num}
                style={{ textAlign: "center", flex: "1 1 180px", maxWidth: 210 }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#0f1117",
                    color: "#ffffff",
                    fontSize: 20,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  {step.num}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#0f1117" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13.5, color: "#4a4d5c", lineHeight: 1.6 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §9 WHAT YOU WALK OUT WITH ── */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Takeaways</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            What you walk out with.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 2rem",
            }}
          >
            Not notes. Not slides. A plan you can act on the same evening — built around your own numbers and goals.
          </p>

          <div
            className="walkout-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.25rem",
              marginTop: "2rem",
            }}
          >
            {WALKOUT_CARDS.map((card) => (
              <div
                key={card.title}
                className="walkout-card"
                style={{
                  border: "1px solid rgba(15,17,23,0.10)",
                  borderRadius: 12,
                  overflow: "hidden",
                  transition: "transform 0.2s, border-color 0.2s",
                }}
              >
                {/* Dark header */}
                <div
                  style={{
                    background: "#0f1117",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#c9982a", flexShrink: 0 }}>{card.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", lineHeight: 1.3 }}>
                    {card.title}
                  </div>
                </div>
                {/* White body */}
                <div style={{ background: "#ffffff", padding: "1.1rem 1.25rem" }}>
                  {card.bullets.map((bullet) => (
                    <div
                      key={bullet}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 9,
                        fontSize: 13,
                        color: "#4a4d5c",
                        lineHeight: 1.55,
                        marginBottom: "0.6rem",
                      }}
                    >
                      <svg width="13" height="13" fill="none" stroke="#c9982a" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {bullet}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Gap 8: walkout callout padding 1rem 1.5rem, color #4a4d5c (ink-muted), margin-top 2rem */}
          <div
            style={{
              background: "#f8f7f4",
              border: "1px solid rgba(15,17,23,0.10)",
              borderLeft: "3px solid #c9982a",
              borderRadius: "0 12px 12px 0",
              padding: "1rem 1.5rem",
              fontSize: 14,
              color: "#4a4d5c",
              lineHeight: 1.65,
              maxWidth: 780,
              margin: "2rem auto 0",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, marginTop: 3 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              <strong style={{ color: "#0f1117", fontWeight: 600 }}>This isn&apos;t a certificate programme.</strong>{" "}
              There are no slides to take home. What you leave with is a working plan — built around your actual numbers, in the room, with a practitioner who can sense-check it on the spot.
            </span>
          </div>
        </div>
      </section>

      {/* ── §10 FAQ ── */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Pill>FAQs</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#0f1117",
              marginBottom: "1rem",
            }}
          >
            Things people ask before they sign up.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#4a4d5c",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            Honest answers — no fine print.
          </p>

          <FaqAccordion />
        </div>
      </section>

      {/* ── §11 TOOLS & CALCULATORS ── */}
      <section style={{ background: "#0f1117", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill dark>Tools &amp; Calculators</Pill>
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
            Free tools to start before the session.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 2rem",
            }}
          >
            These placeholders will link to curated calculators and frameworks aligned to each module. Coming soon — one tool per topic.
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
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="tool-card"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 12,
                  padding: "1.25rem",
                  transition: "background 0.2s, border-color 0.2s",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#c9982a",
                    marginBottom: 8,
                  }}
                >
                  {tool.module}
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#ffffff", marginBottom: 4 }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                  {tool.desc}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.30)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 100,
                    padding: "3px 9px",
                  }}
                >
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §12 CTA ── */}
      <section style={{ background: "#0f1117", padding: "5.5rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill dark>Get Started</Pill>
          <h2
            style={{
              fontSize: "clamp(26px,3.8vw,40px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "#ffffff",
              marginBottom: "1rem",
            }}
          >
            Ready to learn from someone
            <br />
            still doing the work?
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.55)",
              maxWidth: 520,
              margin: "0 auto 2rem",
              lineHeight: 1.65,
            }}
          >
            Tell us your topic, your group, and a preferred date window. We&apos;ll handle the rest offline.
          </p>
          {/* Gap 1 & 19: CTA section uses gold button with speech-bubble icon */}
          <RequestModal variant="gold" />
          <div
            className="cta-reassurance"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
              marginTop: "2rem",
            }}
          >
            {CTA_REASSURANCE.map((item) => (
              <div
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(255,255,255,0.45)" }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §13 FOOTER ── */}
      <footer
        style={{
          background: "#080a0e",
          padding: "2rem",
          textAlign: "center",
          fontSize: 13,
          color: "rgba(255,255,255,0.30)",
        }}
      >
        {/* Practitioner recruitment block */}
        <div
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            paddingBottom: "1.5rem",
            marginBottom: "1.25rem",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c9982a",
              marginBottom: "0.5rem",
            }}
          >
            Are you a finance professional?
          </p>
          <a
            href="/practitioners"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              textDecoration: "none",
              borderBottom: "1px solid rgba(201,152,42,0.35)",
              paddingBottom: 2,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            Teach what you practise — join the iqcommune practitioner network
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <p>
          {/* Gap 12: period after "connects" matches source */}
          <strong style={{ color: "rgba(255,255,255,0.70)", fontWeight: 500 }}>iqcommune</strong>
          {" "}— Where financial intelligence connects. &nbsp;·&nbsp;{" "}
          <a href="mailto:hello@iqcommune.com" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "none" }}>
            hello@iqcommune.com
          </a>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          © {new Date().getFullYear()} iqcommune. All rights reserved.
        </p>
      </footer>
      {/* ── FAQ accordion + card entrance animation ── */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function () {
          var cards = document.querySelectorAll('.iq-animate');
          if (!cards.length) return;
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('iq-visible');
                io.unobserve(entry.target);
              }
            });
          }, { threshold: 0.12 });
          cards.forEach(function (c) { io.observe(c); });
        })();
      `}} />
    </main>
  );
}
