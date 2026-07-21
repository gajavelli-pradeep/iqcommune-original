import { Fragment, type CSSProperties } from "react";
import type { Metadata } from "next";
import { RequestModal } from "@/components/public/RequestModal";
import { FaqAccordion, type FaqItem } from "@/components/public/FaqAccordion";
import { NavBar } from "@/components/public/NavBar";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CountUp } from "@/components/public/CountUp";
import { ToolsSection } from "@/components/public/ToolsSection";
import { GallerySection } from "@/components/public/GallerySection";
import { getBaseUrl } from "@/lib/base-url";

export const metadata: Metadata = {
  title: { absolute: "iqcommune — Where financial intelligence connects" },
  description: "In-person finance sessions led by active practitioners. No products. No pitch. Just knowledge.",
  openGraph: {
    title: "iqcommune — Where financial intelligence connects",
    description: "In-person finance sessions led by active practitioners. No products. No pitch.",
    type: "website",
    siteName: "iqcommune",
  },
  twitter: {
    card: "summary",
    title: "iqcommune — Where financial intelligence connects",
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
    title: "Wealth Managers",
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
    text: "Max 25 participants per session",
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
  "Focus on theory & concepts",
  "Curriculum based on past market conditions",
  "Generic case studies",
  "Limited focus on investor behaviour",
  "Learning ends with the classroom",
] as const;

const DIFF_US = [
  "Blend theory with practical investment applications",
  "Content updated to reflect evolving market conditions",
  "Real-world portfolio and investment examples",
  "They manage money the same way they teach you to",
  "You step out with a clear plan of action with real numbers",
] as const;

/* Comparison table cells are laid out as one flat grid (them-cell, us-cell, them-cell…)
   so paired cells share a grid row and stretch to equal height — a per-column layout
   leaves dead space under the shorter column where the row tint/divider stop. */
const DIFF_HEADER_CELL: CSSProperties = {
  padding: "1.1rem 1.75rem",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(15,17,23,0.18)",
};

const DIFF_ITEM_CELL: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "1rem 1.75rem",
  fontSize: 14,
};

const DIFF_DIVIDER = "1px solid rgba(15,17,23,0.18)";
const DIFF_ROW_RULE = "1px solid rgba(15,17,23,0.10)";

const TOPICS = [
  {
    name: "Foundations of Personal Finance",
    desc: "Budgeting, net worth, emergency funds, insurance, and tax basics — the complete foundation every adult needs before investing a single rupee.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: "Retirement & Goal-Based Financial Planning",
    desc: "Corpus calculation, NPS/EPF/PPF, goal-bucket planning, and handling competing financial goals — all in one session.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "Equity Investing Simplified",
    desc: "From how markets work to reading financials, valuation ratios, and earnings reports — taught by an active equity analyst, not a textbook.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    name: "Debt & Fixed Income Investing",
    desc: "Bonds, G-Secs, debt mutual funds, yield, duration, and tax treatment — the fixed income universe decoded by an active portfolio manager.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: "Asset Allocation & Portfolio Construction",
    desc: "How to split a portfolio across asset classes, build for your risk profile, and rebalance — taught by someone actively making these decisions for real clients.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 0 .5-3" />
      </svg>
    ),
  },
  {
    name: "Investment Solutions & Portfolio Strategies",
    desc: "Mutual fund categories, SIP/STP/SWP mechanics, PMS and AIF, portfolio review frameworks, and tax-efficient investing — taught by a practising portfolio manager.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
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
    desc: "Choose the area that fits your need — or a 6-hour bundle covering two related modules. Unsure? We'll guide you.",
  },
  {
    num: "2",
    title: "Send your request",
    desc: "Share your audience type, group size (up to 25), and a preferred date window. We take it from there.",
  },
  {
    num: "3",
    title: "We get in touch",
    desc: "Our team reaches out to confirm details, align the right practitioner, and lock in the schedule with you.",
  },
  {
    num: "4",
    title: "Attend Session",
    desc: "In-person, focused session — max 25 people — led by a practitioner still active in that field.",
  },
] as const;

const WALKOUT_CARDS = [
  {
    title: "Foundations of Personal Finance",
    bullets: [
      "A personal budget framework mapped to your actual income and expense pattern",
      "Net worth snapshot built in the session — with one specific step to improve it within 30 days",
      "Emergency fund target calculated for your household size and income stability",
      "A ranked financial to-do list — what to fix before the first rupee is invested",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Retirement & Goal-Based Planning",
    bullets: [
      "Your personal retirement corpus number — calculated in the room with your own age, lifestyle cost, and inflation assumption",
      "A NPS / PPF / EPF contribution plan mapped to your current income and retirement timeline",
      "A personal goal-bucket map — each major goal with a timeline, target amount, and instrument match",
      "Monthly SIP amounts needed per goal — calculated in the room with your own numbers",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Equity Investing Simplified",
    bullets: [
      "A stock evaluation template — P/E context, growth rate, moat assessment, and red flag checklist",
      "Ability to read a basic earnings report and extract what matters — practised in the session",
      "A watchlist of 3–5 companies started in the room using the practitioner's shortlisting framework",
      "One valuation ratio calibrated to the current market — what's cheap vs. expensive right now",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Debt & Fixed Income Investing",
    bullets: [
      "A fixed income allocation framework — how to decide what portion of your portfolio belongs in debt and in which instruments",
      "A debt instrument comparison guide — FD vs. debt fund vs. bond vs. G-Sec across risk, return, liquidity, and tax",
      "Clarity on how RBI rate decisions affect your fixed income holdings — with a simple response framework",
      "A tax-efficiency checklist for debt investments — how to minimise the tax drag on fixed income returns",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Asset Allocation & Portfolio Construction",
    bullets: [
      "A personal allocation framework — how to split your investable surplus across asset classes based on your risk profile and timeline",
      "A model portfolio structure (conservative / moderate / aggressive) as a starting reference",
      "A rebalancing trigger framework — simple rules for when and how to adjust the portfolio",
      "A checklist of portfolio construction pitfalls most retail investors make",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M3.05 11a9 9 0 1 0 .5-3" />
      </svg>
    ),
  },
  {
    title: "Portfolio & Investment Strategies",
    bullets: [
      "A portfolio strategy document — your allocation across mutual fund categories, mapped to your risk profile and timeline",
      "A mutual fund shortlist framework — how to evaluate and compare funds within a category before committing",
      "A portfolio review checklist — what to look at, how often, and what triggers a change vs. staying the course",
      "A tax-efficiency action list — two or three moves to reduce the tax drag on your current portfolio",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
] as const;



const CTA_REASSURANCE = [
  "No fixed slots — we schedule around you",
  "Max 25 participants per session",
  "We'll reach out within 2–3 working days",
] as const;

const HOME_FAQS: FaqItem[] = [
  {
    q: "How do I register if I have a group?",
    a: "One person from your group registers as the SPOC (primary contact) on behalf of everyone. You share the group size, topic, a preferred date window, and your venue details. We align a practitioner and confirm the schedule with you directly. Your group takes care of the venue — we handle the rest, from practitioner match to logistics on our end.",
  },
  {
    q: "Will the practitioner try to sell me financial products?",
    a: "No. This is a firm policy, not a preference. During sessions, our practitioners are here purely to educate — no cross-selling, no product pitching, no collecting attendee details for commercial purposes. They have no commercial arrangement with any fund house, brokerage, or insurance company through this programme. The session is about frameworks, concepts, and your questions — nothing else. That said, practitioners are real professionals and you are adults — any interaction or connection that happens outside the session, on a voluntary basis, is entirely between you and them. We don't restrict that, and we don't pretend we can.",
  },
  {
    q: "Are these sessions affiliated with any AMFI, SEBI, or product entity?",
    a: "No. iqcommune is an independent platform. Our practitioners may personally hold relevant certifications (CFP, NISM, etc.), but the sessions are not conducted on behalf of any regulator, distributor, or product company. This independence is deliberate — it's what keeps the content product-agnostic.",
  },
  {
    q: "What exactly will I learn — and what won't be covered?",
    a: "Each session covers the framework and thinking behind a topic — not specific stock tips, fund recommendations, or portfolio advice. You'll leave understanding how to think about a problem, not with a list of things to buy. The practitioner will use real examples from their own work, but the goal is your literacy — not their portfolio.",
  },
  {
    q: "Where are the sessions held? Are they online?",
    a: "All sessions are in-person only. We believe the quality of conversation in a room — the ability to ask follow-up questions, read the room, and get a real-time answer — is central to how this works. Your group finalises the venue once it's formed, and we build the session schedule around it.",
  },
  {
    q: "Can my company book a session for a team?",
    a: (
      <>
        Yes. Organisational sessions work differently — you bring the group (your team), and we align the right practitioner around your schedule. This covers corporates, educational institutions, hospitals, media &amp; production houses, and any organisation looking to upskill its people. Sessions are tailored to your workforce&apos;s financial literacy level and specific needs. Please note that venue and basic infrastructure are to be arranged by your organisation. Use the &quot;Request a Session&quot; form and select <strong>Organisations &amp; Institutions</strong> as your audience type — we&apos;ll take it from there.
      </>
    ),
  },
  {
    q: "Can sessions be bundled into a longer block?",
    a: "Yes — for any audience. Two related modules can run back-to-back as a single 6-hour session, taught by one practitioner end to end. Three combinations are available: Foundations of Personal Finance paired with Retirement & Goal-Based Financial Planning; Equity Investing Simplified paired with Debt & Fixed Income Investing; or Asset Allocation & Portfolio Construction paired with Investment Solutions & Portfolio Strategies. Groups booking a bundle need a minimum of 9 participants (instead of the usual 5). Select your audience type and topic of interest in the \"Request a Session\" form and we'll confirm bundle availability with you.",
  },
  {
    q: "How is the practitioner chosen for my session?",
    a: "We match the practitioner to the module by current role — not just credentials. Someone teaching Equity Investing Simplified is an active equity analyst. Someone covering Investment Solutions & Portfolio Strategies is currently structuring client portfolios. The match is made internally before we confirm your session details.",
  },
  {
    q: "Who arranges the venue?",
    a: (
      <>
        It depends on your audience type.
        <br /><br />
        <strong>Groups</strong> — Venue is your group&apos;s responsibility, same as our Organisation and AMC formats — a society clubhouse, an office room, a community hall, anything that fits. If you&apos;re not sure where to start, let us know your city and we&apos;re happy to point you to a few practical options other groups have used — the booking and any cost is on your group.
        <br /><br />
        <strong>Organisations &amp; Institutions</strong> (corporates, educational institutions, hospitals, media houses) — the venue and basic infrastructure (seating, projector or screen) are to be arranged by your organisation. This gives you flexibility to host the session in a familiar setting for your team. We handle the practitioner, content, and delivery.
        <br /><br />
        <strong>AMCs &amp; Wealth Firms</strong> — venue and setup are on your end. You know your space and your audience best. We focus entirely on the content and the practitioner match.
      </>
    ),
  },
];

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "iqcommune",
  url: getBaseUrl(),
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
          color: dark ? "var(--gold-on-ink)" : "#8a6510",
          background: dark ? "rgba(201,152,42,0.15)" : "#f5e9c8",
          border: `1px solid ${dark ? "rgba(201,152,42,0.3)" : "var(--gold-border)"}`,
          padding: "5px 14px",
          borderRadius: 100,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// Affirmative — accent-filled disc with a confident check (used in the "Us" column).
function CheckmarkSvg({ size = 20, color = "#c9982a" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" style={{ fill: `color-mix(in srgb, ${color} 16%, #ffffff)` }} />
      <path
        d="M16.5 8.75l-5.7 6.2L7.5 11.7"
        fill="none"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: color }}
      />
    </svg>
  );
}

// Negative — muted disc with a hairline ink cross (used in the "Them" column).
function CrossSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#ecebe6" />
      <path d="M15 9l-6 6M9 9l6 6" fill="none" stroke="#71717f" strokeWidth="2" strokeLinecap="round" />
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
        /* Mockup renders this icon inline in a 1.7 line box; Tailwind preflight's
           svg{display:block} collapses it and eats the gap above the title. */
        .pool-role-icon { line-height: 1.7; }
        .pool-role-icon svg { display: inline-block; vertical-align: baseline; }
        @media (max-width: 720px) {
          .hero-inner { grid-template-columns: 1fr; gap: 2.5rem; }
          .hero-before { display: none; }
          /* A comparison table with one side removed is not a comparison. Both
             columns stay on a phone; they get tighter padding and type instead,
             and the paired cells keep sharing a grid row. !important beats the
             inline cell styles. */
          .diff-grid-inner > * {
            padding: 0.75rem 0.7rem !important;
            font-size: 12.5px !important;
            gap: 8px !important;
          }
          .topics-grid { grid-template-columns: 1fr 1fr !important; }
          .audience-grid { gap: 1rem !important; }
          .walkout-grid { grid-template-columns: 1fr 1fr !important; }
          .tools-grid { grid-template-columns: 1fr 1fr !important; }
          .trust-bar-inner, .ribbon-inner, .cta-reassurance { gap: 1.25rem !important; }
          .form-row-modal { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .topics-grid { grid-template-columns: 1fr !important; }
          .pool-role-grid { grid-template-columns: 1fr !important; }
          .walkout-grid { grid-template-columns: 1fr !important; }
          .tools-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <NavBar />

      {/* ── §2 HERO ── */}
      <section
        style={{
          background: "var(--surface-soft)",
          borderBottom: "1px solid rgba(15,17,23,0.10)",
          padding: "5rem 2rem 4.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          className="hero-before hero-glow"
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
                  border: "1px solid var(--gold-border)",
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
                color: "#14161d",
                marginBottom: "1.25rem",
                marginTop: "1.5rem",
              }}
            >
              Real financial insights from{" "}
              <span style={{ color: "var(--gold)" }}>active</span> professionals{" "}—{" "}backed by years of experience.
            </h1>

            {/* Sub */}
            <p
              style={{
                fontSize: 17,
                color: "#383b47",
                maxWidth: 440,
                marginBottom: "2rem",
                lineHeight: 1.65,
              }}
            >
              Built for anyone serious about financial literacy.
            </p>

            {/* Gap 1: hero CTA uses dark ink primary button style */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <RequestModal variant="hero" />
              <span style={{ fontSize: 13, color: "#71717f", display: "flex", alignItems: "center", gap: 6 }}>
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
              background: "linear-gradient(180deg, #ffffff 0%, #fdfcfa 100%)",
              border: "1px solid rgba(15,17,23,0.18)",
              borderRadius: 20,
              padding: "2rem",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 4px rgba(20,16,10,0.05), 0 16px 40px -14px rgba(20,16,10,0.16)",
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
                  <div style={{ fontSize: 26, fontWeight: 600, color: "#14161d", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                    <CountUp value={stat.num} />
                  </div>
                  <div style={{ fontSize: 11, color: "#383b47", marginTop: 2, lineHeight: 1.3 }}>
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
                  className="hover-lift"
                  style={{ background: "#f8f7f4", borderRadius: 10, padding: "0.75rem 0.9rem" }}
                >
                  <div className="pool-role-icon" style={{ color: "#8a6510", marginBottom: 5 }}>{role.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#14161d", marginBottom: 2 }}>
                    {role.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#383b47", lineHeight: 1.4 }}>
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
                color: "#71717f",
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
      <div style={{ background: "#14161d", color: "rgba(255,255,255,0.82)", padding: "0.9rem 2rem" }}>
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
            <div key={item.text} className="hover-lift" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
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
          borderTop: "1px solid var(--gold-border)",
          borderBottom: "1px solid var(--gold-border)",
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
              className="hover-lift"
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            A practitioner is not a trainer.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
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
              border: DIFF_DIVIDER,
              borderRadius: 12,
              overflow: "hidden",
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            <div
              className="diff-col-them"
              style={{
                ...DIFF_HEADER_CELL,
                background: "#f8f7f4",
                color: "#71717f",
                borderRight: DIFF_DIVIDER,
              }}
            >
              Conventional Trainers
            </div>
            <div style={{ ...DIFF_HEADER_CELL, background: "#14161d", color: "#ffffff" }}>
              Our Practitioners
            </div>

            {DIFF_THEM.map((them, i) => {
              const rule = i < DIFF_THEM.length - 1 ? DIFF_ROW_RULE : undefined;
              return (
                <Fragment key={them}>
                  <div
                    className="row-hover diff-col-them"
                    style={{
                      ...DIFF_ITEM_CELL,
                      color: "#383b47",
                      borderRight: DIFF_DIVIDER,
                      borderBottom: rule,
                    }}
                  >
                    <CrossSvg />
                    {them}
                  </div>
                  <div
                    className="row-hover"
                    style={{
                      ...DIFF_ITEM_CELL,
                      color: "#14161d",
                      fontWeight: 500,
                      borderBottom: rule,
                    }}
                  >
                    <CheckmarkSvg color="#c9982a" />
                    {DIFF_US[i]}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── §6 AUDIENCE ── */}
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            Built for anyone serious<br />about financial literacy.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
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
                    background: "var(--gold-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    color: "var(--gold-dark)",
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#14161d", marginBottom: 5 }}>
                  {card.heading}
                </div>
                <div style={{ fontSize: 13, color: "#383b47", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                  {card.desc}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: "var(--gold-dark)",
                        background: "var(--gold-light)",
                        border: "1px solid var(--gold-border)",
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
              color: "#71717f",
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
            All sessions capped at 25 participants — to keep the quality of conversation and interaction high.
          </p>
        </div>
      </section>

      {/* ── §7 TOPICS ── */}
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            What you&apos;ll learn.
          </h2>
          {/* Gap 6 & 24: section-sub margin-bottom matches source 3rem */}
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
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
                className="topic-card"
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
                    background: "var(--gold-light)",
                    color: "var(--gold-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  {topic.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#14161d", marginBottom: 4 }}>
                  {topic.name}
                </div>
                <div style={{ fontSize: 13, color: "#383b47", lineHeight: 1.55 }}>
                  {topic.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6b BUNDLED SESSIONS ── */}
      <section style={{ background: "#ffffff", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Bundled Sessions</Pill>
          <h2
            style={{
              fontSize: "clamp(24px,3.2vw,36px)",
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              textAlign: "center",
              color: "#14161d",
              marginBottom: "0.75rem",
            }}
          >
            Book one module or bundle two into one sitting.
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#383b47",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 2.5rem",
              lineHeight: 1.65,
            }}
          >
            Two related modules, taught back-to-back by one practitioner, as a single 6-hour session — open to every audience.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              maxWidth: 900,
              margin: "0 auto",
            }}
            className="topics-grid"
          >
            {[
              {
                modules: [
                  "Foundations of Personal Finance",
                  "Retirement & Goal-Based Financial Planning",
                ] as [string, string],
                note: "A complete personal-finance-to-retirement arc — get the foundation right, then plan toward the goals it's funding.",
              },
              {
                modules: [
                  "Equity Investing Simplified",
                  "Debt & Fixed Income Investing",
                ] as [string, string],
                note: "The two core asset classes covered together — how to evaluate and invest across equity and debt instruments in a single session.",
              },
              {
                modules: [
                  "Asset Allocation & Portfolio Construction",
                  "Investment Solutions & Portfolio Strategies",
                ] as [string, string],
                note: "Decide the allocation, then pick the instruments to execute it — strategy through to implementation in one session.",
              },
            ].map((bundle) => (
              <div
                key={bundle.modules[0]}
                style={{
                  background: "#f8f7f4",
                  border: "1px solid rgba(15,17,23,0.10)",
                  borderRadius: 12,
                  padding: "1.5rem",
                }}
              >
                {/* "6 hrs total" label */}
                <div style={{ fontSize: 16, fontWeight: 600, color: "#14161d", marginBottom: "1rem" }}>
                  6 hrs total
                </div>

                {/* Module rows */}
                <div style={{ display: "flex", flexDirection: "column", marginBottom: "1rem" }}>
                  {(bundle.modules as [string, string]).map((mod, idx) => (
                    <div
                      key={mod}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "0.6rem 0",
                        borderBottom: idx === 0 ? "1px solid rgba(15,17,23,0.10)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#8a6510", flexShrink: 0, marginTop: 2 }}>
                          {idx === 0 ? "01" : "02"}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#14161d" }}>{mod}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#71717f",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                          background: "#fff",
                          border: "1px solid rgba(15,17,23,0.10)",
                          padding: "2px 8px",
                          borderRadius: 100,
                        }}
                      >
                        3 hrs
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bundle note */}
                <div style={{ fontSize: 13, color: "#383b47", lineHeight: 1.55 }}>
                  {bundle.note}
                </div>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: "#71717f", marginTop: "1.5rem" }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", marginRight: 5, marginTop: -2 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Bundling is open to all audiences. Groups booking a bundle need a minimum of 9 participants, instead of the usual 5, to make the longer session worthwhile.
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            How it works.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
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
                className="step"
                style={{ textAlign: "center", flex: "1 1 180px", maxWidth: 210 }}
              >
                <div
                  className="step-circle"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "#14161d",
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
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#14161d" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13.5, color: "#383b47", lineHeight: 1.6 }}>
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            What you walk out with.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
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
                    background: "#14161d",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "var(--gold)", flexShrink: 0 }}>{card.icon}</span>
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
                        color: "#383b47",
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

          {/* Gap 8: walkout callout padding 1rem 1.5rem, color #383b47 (ink-muted), margin-top 2rem */}
          <div
            style={{
              background: "#f8f7f4",
              border: "1px solid rgba(15,17,23,0.10)",
              borderLeft: "3px solid #c9982a",
              borderRadius: "0 12px 12px 0",
              padding: "1rem 1.5rem",
              fontSize: 14,
              color: "#383b47",
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
              <strong style={{ color: "#14161d", fontWeight: 600 }}>This isn&apos;t a certificate programme.</strong>{" "}
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
              color: "#14161d",
              marginBottom: "1rem",
            }}
          >
            Things people ask before they sign up.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "#383b47",
              textAlign: "center",
              maxWidth: 520,
              margin: "0 auto 3rem",
            }}
          >
            Honest answers — no fine print.
          </p>

          <FaqAccordion items={HOME_FAQS} />
        </div>
      </section>

      {/* ── §12 TOOLS & CALCULATORS ── */}
      <ToolsSection />

      {/* ── §13 CTA ── */}
      <section style={{ background: "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(201,152,42,0.14), transparent 72%), #14161d", borderTop: "1px solid rgba(201,152,42,0.18)", padding: "5.5rem 2rem", textAlign: "center" }}>
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
            If you are serious to improve your financial literacy
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
                style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "rgba(255,255,255,0.62)" }}
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

      {/* ── GALLERY ── */}
      <GallerySection />

      {/* ── FOOTER ── */}
      <SiteFooter
        email="hello@iqcommune.com"
        tagline="Where financial intelligence connects"
        top={
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "1.5rem", marginBottom: "1.25rem" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: "0.5rem",
              }}
            >
              Are you a finance professional?
            </p>
            <a
              href="/practitioners"
              className="link-arrow"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 14,
                fontWeight: 500,
                color: "rgba(255,255,255,0.65)",
                textDecoration: "none",
                borderBottom: "1px solid var(--gold-rule)",
                paddingBottom: 2,
              }}
            >
              Teach what you practise — join the iqcommune practitioner network
              <svg className="link-chevron" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        }
      />
    </main>
  );
}
