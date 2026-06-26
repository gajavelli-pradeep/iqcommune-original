import type { Metadata } from "next";
import { RequestModal } from "@/components/public/RequestModal";
import { FaqAccordion, type FaqItem } from "@/components/public/FaqAccordion";
import { NavBar } from "@/components/public/NavBar";
import { SiteFooter } from "@/components/public/SiteFooter";
import { RevealOnScroll } from "@/components/public/RevealOnScroll";
import { CountUp } from "@/components/public/CountUp";
import { moduleAccent, paletteAccent, accentVars } from "@/lib/accents";
import { ToolsSection } from "@/components/public/ToolsSection";
import { GallerySection } from "@/components/public/GallerySection";

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
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
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
    desc: "Choose the area that fits your need — or let us guide you if you're unsure where to start.",
  },
  {
    num: "2",
    title: "Send your request",
    desc: "Share your audience type, group size (up to 25), and a preferred date window. We take it from there.",
  },
  {
    num: "3",
    title: "We get in touch",
    desc: "Our team reaches out to confirm details, align the right practitioner, and finalise the venue with you.",
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
      "A personal budget framework mapped to your actual income and expenses",
      "A net worth snapshot and a clear step to improve it within 30 days",
      "Emergency fund target calculated for your specific situation",
      "Insurance gap analysis — how much cover you actually need vs. what you have",
    ],
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Retirement & Goal-Based Financial Planning",
    bullets: [
      "Your personal retirement corpus number — calculated with real inflation assumptions",
      "A NPS/PPF/EPF contribution plan mapped to your timeline",
      "A goal-bucket plan — each goal mapped to a timeline and an instrument",
      "Monthly SIP amounts needed per goal — calculated in the room, for your numbers",
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
      "A personal stock evaluation template — P/E, growth, moat, and red flags",
      "How to read an earnings report in under 10 minutes",
      "A framework to read market movements without getting swept up in media noise",
      "A watchlist-building approach you can apply immediately",
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
      "A framework for choosing between bonds, G-Secs, and debt mutual funds",
      "How to calculate yield-to-maturity and apply duration to your portfolio",
      "Tax treatment across fixed income instruments — post-tax return comparison",
      "When to use debt vs. equity for a specific goal or time horizon",
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
      "A starter allocation plan — how to split your investable surplus across asset classes",
      "A rebalancing framework — when to act, when to hold",
      "Risk profile to allocation mapping — not generic, but built for your numbers",
      "A checklist to evaluate any portfolio decision before committing",
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
    title: "Investment Solutions & Portfolio Strategies",
    bullets: [
      "Mutual fund category map — which fund type for which goal and horizon",
      "SIP/STP/SWP mechanics — when and how to use each",
      "PMS and AIF — who they're for and what to verify before investing",
      "A portfolio review framework you can run quarterly, without an advisor",
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
    a: "One person from your group registers as the SPOC (primary contact) on behalf of everyone. You share the group size, topic, a preferred date window, and a venue if you have one in mind. We align a practitioner and confirm details with you directly. You then coordinate within your group — we handle everything else.",
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
    a: "All sessions are in-person only. We believe the quality of conversation in a room — the ability to ask follow-up questions, read the room, and get a real-time answer — is central to how this works. The venue is confirmed after your group is formed and shared with you ahead of the session.",
  },
  {
    q: "Can my company book a session for a team?",
    a: (
      <>
        Yes. Organisational sessions work differently — you bring the group (your team), and we align the right practitioner around your schedule. This covers corporates, educational institutions, hospitals, media &amp; production houses, and any organisation looking to upskill its people. Sessions are tailored to your workforce&apos;s financial literacy level and specific needs. Please note that venue and basic infrastructure are to be arranged by your organisation. Use the &ldquo;Request a Session&rdquo; form and select <strong>Organisations &amp; Institutions</strong> as your audience type — we&apos;ll take it from there.
      </>
    ),
  },
  {
    q: "How is the practitioner chosen for my session?",
    a: "We match the practitioner to the module by current role — not just credentials. Someone teaching Equity Investing Simplified is an active equity analyst. Someone covering Retirement & Goal-Based Financial Planning is currently structuring client portfolios. The match is made internally before we confirm your session details.",
  },
  {
    q: "Who arranges the venue?",
    a: (
      <>
        It depends on your audience type.
        <br /><br />
        <strong>Groups</strong> — If your group has a preferred space — a society clubhouse, an office room, a community hall — that&apos;s always welcome and we&apos;ll gladly use it. If not, don&apos;t worry at all. We&apos;ll find and book a suitable venue in your city and share the details with the SPOC well ahead of the session.
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
          background: "linear-gradient(180deg, #ffffff 0%, #f8f7f4 100%)",
          borderBottom: "1px solid rgba(20,18,12,0.10)",
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
              Real finance knowledge —{" "}
              <span style={{ color: "var(--gold-dark)" }}>from professionals</span>{" "}actively navigating the same markets you&apos;re trying to understand.
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
              You deserve to learn from someone who&apos;d stake their own money on what they teach.
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
              border: "1px solid rgba(20,18,12,0.18)",
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
                    borderRight: i < 2 ? "1px solid rgba(20,18,12,0.10)" : undefined,
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
            <div style={{ height: 1, background: "rgba(20,18,12,0.10)", margin: "1rem 0" }} />

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
                  <div style={{ color: "#8a6510", marginBottom: 5 }}>{role.icon}</div>
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
                borderTop: "1px solid rgba(20,18,12,0.10)",
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
            className="iq-animate"
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
              border: "1px solid rgba(20,18,12,0.18)",
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
                  color: "#71717f",
                  borderBottom: "1px solid rgba(20,18,12,0.18)",
                }}
              >
                Typical training programme
              </div>
              {DIFF_THEM.map((text, i) => (
                <div
                  key={text}
                  className="row-hover iq-animate"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < DIFF_THEM.length - 1 ? "1px solid rgba(20,18,12,0.10)" : undefined,
                    fontSize: 14,
                    color: "#383b47",
                    borderRight: "1px solid rgba(20,18,12,0.18)",
                    animationDelay: `${0.05 * i}s`,
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
                  background: "#14161d",
                  color: "#ffffff",
                  borderBottom: "1px solid rgba(20,18,12,0.18)",
                }}
              >
                iqcommune — Active Practitioners
              </div>
              {DIFF_US.map((text, i) => (
                <div
                  key={text}
                  className="row-hover iq-animate"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < DIFF_US.length - 1 ? "1px solid rgba(20,18,12,0.10)" : undefined,
                    fontSize: 14,
                    color: "#14161d",
                    fontWeight: 500,
                    animationDelay: `${0.05 * i}s`,
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
            className="iq-animate"
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
            {TOPICS.map((topic) => {
              const accent = moduleAccent(topic.name);
              return (
              <div
                key={topic.name}
                className="topic-card iq-animate"
                style={{
                  background: `linear-gradient(180deg, ${accent.light} 0%, #ffffff 52%)`,
                  border: `1px solid color-mix(in srgb, ${accent.base} 20%, rgba(20,18,12,0.10))`,
                  borderTop: `3px solid ${accent.base}`,
                  borderRadius: 12,
                  padding: "1.5rem",
                  ...accentVars(accent),
                }}
              >
                <div
                  className="card-icon"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: accent.light,
                    color: accent.base,
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ── §7 AUDIENCE ── */}
      <section style={{ background: "#ffffff", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Who is this for</Pill>
          <h2
            className="iq-animate"
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
            {AUDIENCE_CARDS.map((card, i) => {
              const accent = paletteAccent(i);
              return (
              <div
                key={card.heading}
                className="audience-card-inner iq-animate"
                style={{
                  background: `linear-gradient(180deg, ${accent.light} 0%, #f8f7f4 54%)`,
                  border: `1.5px solid color-mix(in srgb, ${accent.base} 20%, rgba(20,18,12,0.10))`,
                  borderTop: `3px solid ${accent.base}`,
                  borderRadius: 12,
                  padding: "1.6rem 1.75rem",
                  flex: "1 1 210px",
                  maxWidth: 240,
                  ...accentVars(accent),
                }}
              >
                <div
                  className="card-icon"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: accent.light,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    color: accent.base,
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
                        color: accent.ink,
                        background: accent.light,
                        border: `1px solid ${accent.base}33`,
                        padding: "3px 9px",
                        borderRadius: 100,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              );
            })}
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

      {/* ── §8 HOW IT WORKS ── */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Pill>Process</Pill>
          <h2
            className="iq-animate"
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
            className="iq-animate"
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
            {WALKOUT_CARDS.map((card) => {
              const accent = moduleAccent(card.title);
              return (
              <div
                key={card.title}
                className="walkout-card iq-animate"
                style={{
                  border: "1px solid rgba(20,18,12,0.10)",
                  borderTop: `3px solid ${accent.base}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  ...accentVars(accent),
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
                  <span style={{ color: accent.base, flexShrink: 0 }}>{card.icon}</span>
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
              );
            })}
          </div>

          {/* Gap 8: walkout callout padding 1rem 1.5rem, color #383b47 (ink-muted), margin-top 2rem */}
          <div
            style={{
              background: "#f8f7f4",
              border: "1px solid rgba(20,18,12,0.10)",
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

      {/* ── §10 GALLERY ── */}
      <GallerySection />

      {/* ── §11 FAQ ── */}
      <section style={{ background: "#f8f7f4", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <Pill>FAQs</Pill>
          <h2
            className="iq-animate"
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
            className="iq-animate"
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

      {/* ── §13 FOOTER ── */}
      <SiteFooter
        email="hello@iqcommune.com"
        tagline="Where financial intelligence connects."
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
                borderBottom: "1px solid rgba(201,152,42,0.35)",
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
      {/* Card entrance animation — reveals .iq-animate elements on scroll. */}
      <RevealOnScroll />
    </main>
  );
}
