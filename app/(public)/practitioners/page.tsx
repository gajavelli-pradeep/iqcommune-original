import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "@/components/public/ApplicationForm";
import { RevealOnScroll } from "@/components/public/RevealOnScroll";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { moduleAccent, paletteAccent, accentVars } from "@/lib/accents";

export const metadata: Metadata = {
  title: "Join as a Practitioner",
  description:
    "Finance professionals — share what you actually do, for 2–3 hours, with a small group. No slides needed. Join the iqcommune practitioner network.",
  openGraph: {
    title: "Join as a Practitioner",
    description:
      "Finance professionals — share what you actually do, for 2–3 hours, with a small group. No slides needed.",
    url: "https://iqcommune.com/practitioners",
    siteName: "iqcommune",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join as a Practitioner",
    description:
      "Finance professionals — share what you actually do, for 2–3 hours, with a small group. No slides needed.",
  },
};

/* ─── Static data ─── */

interface Perk {
  title: string;
  sub: string;
  icon: React.ReactNode;
}

const PERKS: Perk[] = [
  {
    title: "Earn on the side — without selling",
    sub: "Revenue share per session. We bring the audience. You just show up and teach.",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "2–3 hours. Your schedule.",
    sub: "Sessions are short, infrequent, and confirmed with you before anything is committed.",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Your identity stays protected",
    sub: "We never publish your name or organisation publicly. Your participation is entirely on your terms.",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Small, serious groups only",
    sub: "Max 25 participants per session. Curated. In-person. No webinar crowds.",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "No content creation required",
    sub: "You teach from your own experience. No slides to build, no curriculum to write.",
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

const TRUST_ITEMS = [
  {
    text: "Your name & identity are never published",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    text: "No upfront fees — ever",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    text: "No sales or business development required",
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
] as const;

// Gap 6 & 7 & 8: Update ROLES with exact source copy, SVG icons, remove ideal field from render data
const ROLES = [
  {
    title: "Equity Analysts",
    desc: "Currently writing research, tracking companies, and forming views on markets every trading day.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Portfolio Managers",
    desc: "Actively managing equity, debt, or hybrid portfolios — with a live P&L attached to every call you make.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    title: "Certified Financial Planners",
    desc: "SEBI-registered, currently advising clients on goal-based investing, retirement, or financial planning.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Wealth Advisors & RMs",
    desc: "Working with HNI or retail clients every day — structuring portfolios, having money conversations for real.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Fund & Product Specialists",
    desc: "Deep expertise in specific instruments — fixed income, derivatives, structured products — actively working with these today, whether in a firm or independently.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Corporate Finance Professionals",
    desc: "CFOs, treasury managers, or finance controllers with hands-on exposure to capital allocation and planning.",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
] as const;

interface Step {
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    title: "Apply in 5 minutes",
    desc: "Tell us your current role, years of experience, and which module you'd teach. A short note on why you want to do this.",
  },
  {
    title: "We reach out",
    desc: "Within 2–3 working days. A brief conversation — no formal interview, no audition. Just a check for fit and intent.",
  },
  {
    title: "Get matched",
    desc: "We align you to a module that fits your active expertise. When a session is requested, we check your availability first.",
  },
  {
    title: "Teach & earn",
    desc: "Show up, teach from your own experience, answer real questions. Revenue share is paid out after each confirmed session.",
  },
];

// Contextual row icon — each table row gets an icon matched to its meaning.
type RowIcon =
  | "megaphone" | "users" | "pin" | "calendar" | "rupee" | "shield"
  | "award" | "clock" | "briefcase" | "chat" | "check" | "ban";

const ROW_ICON_PATHS: Record<RowIcon, React.ReactNode> = {
  megaphone: <><path d="M3 11l15-5v12L3 14z" /><path d="M11.5 17a2.5 2.5 0 0 1-4.7-1.2" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  rupee: <><path d="M6 3h12M6 8h12M9 13a4 4 0 0 0 4-4M6 13h7l-3 8" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  award: <><circle cx="12" cy="8" r="6" /><path d="M8.2 13.9 7 22l5-3 5 3-1.2-8.1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
};

function RowIconSvg({ name, color }: { name: RowIcon; color: string }) {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 2, stroke: color }}
    >
      {ROW_ICON_PATHS[name]}
    </svg>
  );
}

// Gap 11: exact source copy — icon matched to each responsibility.
const IQCOMMUNE_HANDLES: { text: string; icon: RowIcon }[] = [
  { text: "All client acquisition and marketing", icon: "megaphone" },
  { text: "Group formation and cohort management", icon: "users" },
  { text: "Venue booking (for individual/group sessions)", icon: "pin" },
  { text: "Scheduling, confirmations & logistics", icon: "calendar" },
  { text: "Fee collection and revenue share payout", icon: "rupee" },
  { text: "Your identity and privacy protection", icon: "shield" },
];

// Gap 12: exact source copy — icon matched to each contribution.
const YOU_BRING: { text: string; icon: RowIcon }[] = [
  { text: "Active, current expertise in your domain", icon: "award" },
  { text: "2–3 hours for each confirmed session", icon: "clock" },
  { text: "Real examples from your current work", icon: "briefcase" },
  { text: "Willingness to take genuine questions", icon: "chat" },
  { text: "Availability confirmation before each session", icon: "check" },
  { text: "Commitment to no product cross-selling", icon: "ban" },
];

interface ModuleCard {
  name: string;
  ideal: string;
  desc: string;
  icon: React.ReactNode;
}

const MODULE_CARDS: ModuleCard[] = [
  {
    name: "Foundations of Personal Finance",
    ideal: "Ideal if you're a: CFP, financial planner, IFA",
    desc: "Budgeting, net worth, emergency funds, insurance, and tax basics. Teaching people to get their complete foundation right before they invest a single rupee.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    name: "Retirement & Goal-Based Financial Planning",
    ideal: "Ideal if you're a: CFP, pension specialist, wealth planner",
    desc: "Corpus calculations, NPS/EPF/PPF, goal-bucket planning, and competing financial goals. The conversations most people delay — you know how to make them urgent and actionable.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "Equity Investing Simplified",
    ideal: "Ideal if you're a: Equity analyst, research head, fund manager",
    desc: "How markets work, reading financials, valuation ratios, and earnings reports. Taught from the desk of someone using these tools professionally every day.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    name: "Debt & Fixed Income Investing",
    ideal: "Ideal if you're a: Bond trader, portfolio manager, fixed income analyst",
    desc: "Bonds, G-Secs, debt mutual funds, yield, duration, and tax treatment — the fixed income universe decoded by someone actively managing these instruments.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: "Asset Allocation & Portfolio Construction",
    ideal: "Ideal if you're a: Portfolio manager, wealth advisor, RM",
    desc: "How to split a portfolio across asset classes, build for risk profile, and rebalance. You're actively making these decisions for real clients — now help others make them for themselves.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    name: "Investment Solutions & Portfolio Strategies",
    ideal: "Ideal if you're a: Practising portfolio manager, distributor, RM",
    desc: "Mutual fund categories, SIP/STP/SWP, PMS and AIF, portfolio review frameworks, and tax-efficient investing — for someone who applies this daily.",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

// Gap 13: exact source copy
const GOOD_FIT = [
  "Are actively practising in finance — employed, self-employed, or independent",
  "Are comfortable talking about what you do without a script",
  "Want a side income without any business development work",
  "Available for at least one session every few months — and when you say yes, you see it through",
  "Comfortable with the disclosure terms — what gets shared with session organisers and when",
];

// Gap 14: exact source copy
const NOT_FIT = [
  "Have left finance and are looking to transition into training full-time",
  "Want to actively pitch or sell products, funds, or services during sessions",
  "Are looking for a regular, guaranteed monthly income",
  "Say yes to sessions and then become unavailable — reliability matters more than frequency",
  "Have fewer than 5 years of active, full-time finance experience",
];

const NEVER_DISCLOSED = [
  "Your full name",
  "Your employer's name",
  "Your personal contact details",
  "Any photos, profiles, or endorsements",
];

const SHARED_ON_CONFIRM = [
  "Your first name only",
  "Years of experience and domain",
  "Your organisation or practice name — shared with your consent, adds credibility with the organiser. Independent practitioners are described as such.",
  "A coordination contact through iqcommune — not your personal number",
];

interface FAQ {
  q: string;
  a: React.ReactNode;
}

const FAQS: FAQ[] = [
  {
    q: "Will my employer or clients know I'm doing this?",
    a: "We never publish your name, job title, or organisation anywhere on our platform or in any public channel. However, we want to be fully honest about what happens operationally: once you confirm availability for a session, the session organiser receives a brief profile — your first name, organisation or practice name, domain, and years of experience. This is shared with your explicit consent (captured during onboarding) and adds credibility with the organiser. If you are independent, we describe you as an independent practitioner in your domain — never as a freelancer or trainer. All coordination goes through iqcommune, not your personal contact. Whether you inform your employer (if you have one) is entirely your call — we don't require it and we don't make it necessary.",
  },
  {
    q: "Will clients eventually find out who I am?",
    a: (
      <>
        <p style={{ margin: 0 }}>We want to be honest about this too. Once a session is confirmed, the organiser knows your name and your organisation or practice — and in an in-person session, your identity becomes known in the room. We can&apos;t prevent that, and we won&apos;t pretend otherwise.</p>
        <p style={{ margin: "0.75em 0 0" }}>What we control is the layer before that: nothing appears publicly, your personal contact details are never given to clients, and employer disclosure to organisers only happens after your explicit availability confirmation and consent. Our empanelment agreement also asks participants not to seek commercial relationships with practitioners outside of the platform — but we acknowledge we can&apos;t fully control what happens after a session. The best protection is a platform worth staying on, which is what we&apos;re building.</p>
      </>
    ),
  },
  {
    q: "How does the revenue sharing work?",
    a: "The exact revenue share percentage is discussed and confirmed during the onboarding conversation — before you commit to anything. We don't publish a fixed number here because it may vary based on session type, audience, and format. What we can say: you will always know the exact amount you'll earn before a session is confirmed. There are no surprises.",
  },
  {
    q: "Do I need to prepare a presentation or course material?",
    a: "No. The entire premise of iqcommune is that you teach from your own experience — not from a scripted deck. You don't need slides, notes, or a curriculum. We'll share a loose session outline (the key areas participants expect to cover) but what happens in the room is driven by you and the questions the group asks. That's the point.",
  },
  {
    q: "Can I be listed for more than one module?",
    a: "Yes — if your experience genuinely spans multiple areas, you can indicate that in the application. We'll have a conversation to understand your depth in each. We'd rather match you to one module you're excellent at than spread you across three where the quality thins out. We'll guide this together.",
  },
  {
    q: "What if I'm approached by a participant after the session?",
    a: (
      <>
        <p style={{ margin: 0 }}>That&apos;s entirely up to you. You&apos;re welcome to share your own contact details or business card with attendees during or after the session — that&apos;s your professional identity to share as you see fit.</p>
        <p style={{ margin: "0.75em 0 0" }}>What we ask is that the session itself stays clean: no product pitching, no cross-selling, and no collecting attendee contact details in bulk during the session. What happens between you and an individual after the session — a conversation, a professional connection, or anything else — is purely between the two of you. iqcommune has no role in it and places no restriction on it.</p>
      </>
    ),
  },
  {
    q: "How far in advance will I know about a session?",
    a: "We typically confirm sessions 1–2 weeks in advance. Before we confirm anything, we always check your availability first. You're never committed to a session you didn't agree to. If the timing doesn't work, we find another practitioner for that request — no pressure, no obligation.",
  },
  {
    q: "Is there any exclusivity — can I do similar sessions independently?",
    a: "No exclusivity. You're free to conduct your own independent sessions or workshops. The empanelment is non-exclusive by design — we don't want to restrict what you do with your own expertise outside of our platform.",
  },
  {
    q: "Can my revenue share be paid to a family member's account?",
    a: "Yes. We understand this is a practical consideration for some professionals and we accommodate it. During the application, you can specify a family member's name, relationship, and payment details. You'll be asked to sign a simple declaration confirming you authorise this arrangement and acknowledge that the tax responsibility remains yours. We don't question the reason — we just need the authorisation documented.",
  },
];

/* ─── Reusable pill ─── */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--gold-dark)",
        background: "var(--gold-light)",
        border: "1px solid var(--gold-border)",
        padding: "5px 14px",
        borderRadius: 100,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Dark pill (for Honest section) ─── */
function DarkPill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--gold-on-ink)",
        background: "rgba(201,152,42,0.15)",
        border: "1px solid rgba(201,152,42,0.30)",
        padding: "5px 14px",
        borderRadius: 100,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Page ─── */
export default function PractitionersPage() {
  return (
    <main style={{ background: "var(--surface)", minHeight: "100vh", fontFamily: "inherit" }}>
      <style>{`
        @media (max-width: 720px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-right-card { display: none !important; }
          .roles-grid { grid-template-columns: 1fr 1fr !important; }
          .modules-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-row { flex-direction: column !important; align-items: center !important; }
          .handle-grid { grid-template-columns: 1fr !important; }
          .honest-grid { grid-template-columns: 1fr !important; }
          .disclosure-grid { grid-template-columns: 1fr !important; }
          .trust-bar-inner { gap: 1.25rem !important; }
        }
        @media (max-width: 480px) {
          .roles-grid { grid-template-columns: 1fr !important; }
          .modules-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── §1 NAV ── */}
      <SiteHeader
        logoHref="/"
        badge={["Practitioner", "Network"]}
        right={
          <Link
            href="/"
            className="foot-link"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-muted)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to main site
          </Link>
        }
      />

      {/* ── §2 HERO ── */}
      <section
        style={{
          background: "var(--ink)",
          padding: "5.5rem 2rem 5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(201,152,42,0.12) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(201,152,42,0.06) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />

        <div
          className="hero-grid"
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 420px",
            gap: "4rem",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left column */}
          <div>
            {/* Badge */}
            <div style={{ marginBottom: 24 }}>
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
                  border: "1px solid rgba(201,152,42,0.30)",
                  padding: "5px 14px",
                  borderRadius: 100,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                For Finance Professionals
              </span>
            </div>

            {/* H1 */}
            <h1
              style={{
                fontSize: "clamp(32px,4.5vw,54px)",
                fontWeight: 600,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                color: "var(--surface)",
                marginBottom: "1.25rem",
              }}
            >
              You spend your days
              <br />
              managing real money.
              <br />
              <span style={{ color: "var(--gold)" }}>
                Most people will never
                <br />
                learn from someone like you.
              </span>
            </h1>

            {/* Body */}
            <p
              style={{
                fontSize: 17,
                color: "rgba(255,255,255,0.6)",
                maxWidth: 460,
                lineHeight: 1.65,
                marginBottom: "2rem",
              }}
            >
              iqcommune connects working finance professionals with people who want to learn from someone still in the field. You bring the knowledge. We handle everything else.
            </p>

            {/* CTA */}
            <a
              href="#apply-form"
              className="btn-cta"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--gold)",
                color: "var(--ink)",
                borderRadius: 100,
                padding: "14px 30px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                minHeight: 44,
                boxShadow: "0 6px 24px rgba(201,152,42,0.35)",
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Apply to Join the Network
            </a>

            {/* Trust note */}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 28, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              No upfront fees. No sales work. We&apos;ll reach out within 2–3 working days.
            </p>
          </div>

          {/* Right column — perks card */}
          <div
            className="hero-right-card"
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "2rem",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
                marginBottom: "1.1rem",
              }}
            >
              What this means for you
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {PERKS.map((perk, i) => (
                <div
                  key={perk.title}
                  className="iq-perk iq-animate"
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    paddingTop: "0.85rem",
                    paddingBottom: "0.85rem",
                    borderBottom: i < PERKS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                    animationDelay: `${0.06 * i}s`,
                  }}
                >
                  <div
                    className="iq-perk-icon"
                    style={{
                      width: 34,
                      height: 34,
                      background: "rgba(201,152,42,0.15)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "var(--gold)",
                      marginTop: 1,
                    }}
                  >
                    {perk.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--surface)", marginBottom: 2 }}>
                      {perk.title}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      {perk.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §3 TRUST BAR ── */}
      <div
        style={{
          background: "var(--gold-light)",
          borderTop: "1px solid var(--gold-border)",
          borderBottom: "1px solid var(--gold-border)",
          padding: "0.9rem 2rem",
        }}
      >
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
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.text}
              className="hover-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--gold-dark)",
              }}
            >
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Gap 5: §4 DIFFERENTIATOR section REMOVED — goes directly to WHO WE WANT */}

      {/* ── §5 WHO WE WANT ── */}
      <section style={{ background: "var(--surface-soft)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>Who we&apos;re looking for</Pill>
            {/* Gap 10: section-headline font size clamp(26px,3.8vw,40px) */}
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Currently in the field.
              <br />
              That&apos;s the only requirement that matters.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              We don&apos;t shortlist by credentials alone. What qualifies you is that you&apos;re actively doing the work — right now.
            </p>
          </div>
          <div
            className="roles-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
            }}
          >
            {/* Gap 6, 7, 8: SVG icons, exact source desc, no ideal line */}
            {ROLES.map((role, i) => {
              const accent = paletteAccent(i);
              return (
              <div
                key={role.title}
                className="role-card iq-animate"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    color: accent.base,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {role.icon}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  {role.title}
                </div>
                {/* Gap 7: no ideal line rendered */}
                <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.55 }}>{role.desc}</div>
              </div>
              );
            })}
          </div>

          {/* Gap 9: footnote with info SVG + exact source text */}
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--ink-faint)",
              marginTop: "1.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline", verticalAlign: "middle", flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            Minimum 5 years of active, hands-on experience in your domain. Employed or independent — what matters is that you are actively practising, not that you work for an organisation.
          </p>
        </div>
      </section>

      {/* ── §6 HOW IT WORKS ── */}
      <section style={{ background: "var(--surface)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>The process</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Simple from your end.
              <br />
              Deliberately so.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              We&apos;ve structured this so your time investment is minimal — until you&apos;re actually in the room teaching.
            </p>
          </div>
          <div
            className="steps-row iq-steps"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "2rem",
              maxWidth: 960,
              margin: "0 auto",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div className="iq-step-connector" aria-hidden="true" />
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="step"
                style={{ flex: "1 1 180px", maxWidth: 210, textAlign: "center", position: "relative" }}
              >
                <div
                  className="step-circle"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    color: "var(--surface)",
                    fontSize: 20,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                    position: "relative",
                    zIndex: 1,
                    boxShadow: `0 0 0 4px #ffffff, 0 0 0 5px color-mix(in srgb, ${paletteAccent(i).base} 50%, transparent)`,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--ink-muted)", lineHeight: 1.6 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §7 WHAT WE HANDLE ── */}
      <section style={{ background: "var(--surface-soft)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>Division of work</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Your job is to teach.
              <br />
              Everything else is ours.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              We&apos;ve built the platform so you never have to do the work you didn&apos;t sign up for.
            </p>
          </div>

          <div
            className="handle-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              border: "1px solid rgba(20,18,12,0.18)",
              borderRadius: 12,
              overflow: "hidden",
              maxWidth: 860,
              margin: "0 auto",
            }}
          >
            {/* iqcommune handles */}
            <div style={{ background: "var(--surface)" }}>
              <div
                style={{
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid rgba(20,18,12,0.18)",
                  background: "var(--ink)",
                  color: "var(--surface)",
                }}
              >
                iqcommune handles
              </div>
              {IQCOMMUNE_HANDLES.map((item, i) => (
                <div
                  key={item.text}
                  className="row-hover iq-animate"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < IQCOMMUNE_HANDLES.length - 1 ? "1px solid rgba(20,18,12,0.10)" : "none",
                    fontSize: 14,
                    color: "var(--ink)",
                    fontWeight: 500,
                    lineHeight: 1.5,
                    animationDelay: `${0.04 * i}s`,
                  }}
                >
                  <RowIconSvg name={item.icon} color="var(--gold)" />
                  {item.text}
                </div>
              ))}
            </div>

            {/* You bring */}
            <div style={{ background: "var(--surface-soft)" }}>
              <div
                style={{
                  padding: "1.1rem 1.75rem",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid rgba(20,18,12,0.18)",
                  background: "var(--surface-soft)",
                  color: "var(--ink-faint)",
                }}
              >
                You bring
              </div>
              {YOU_BRING.map((item, i) => (
                <div
                  key={item.text}
                  className="row-hover iq-animate"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "1rem 1.75rem",
                    borderBottom: i < YOU_BRING.length - 1 ? "1px solid rgba(20,18,12,0.10)" : "none",
                    fontSize: 14,
                    color: "var(--ink-muted)",
                    lineHeight: 1.5,
                    animationDelay: `${0.04 * i}s`,
                  }}
                >
                  <RowIconSvg name={item.icon} color="var(--ink-faint)" />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §8 TEACHING MODULES ── */}
      <section style={{ background: "var(--surface)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>Teaching modules</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Six modules. One per practitioner.
            </h2>
            {/* Gap 49: margin 0 auto 3rem */}
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              Each module is taught by a single practitioner currently active in that specific area. You apply for the one that fits your expertise.
            </p>
          </div>
          <div
            className="modules-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {MODULE_CARDS.map((mod) => {
              const accent = moduleAccent(mod.name);
              return (
              <div
                key={mod.name}
                className="module-card iq-animate"
                style={{
                  background: `linear-gradient(180deg, ${accent.light} 0%, #f8f7f4 54%)`,
                  border: `1.5px solid color-mix(in srgb, ${accent.base} 20%, rgba(20,18,12,0.10))`,
                  borderTop: `3px solid ${accent.base}`,
                  borderRadius: 12,
                  padding: "1.25rem",
                  ...accentVars(accent),
                }}
              >
                <div
                  className="card-icon"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9,
                    background: accent.light,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.85rem",
                    color: accent.base,
                  }}
                >
                  {mod.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>
                  {mod.name}
                </div>
                <div style={{ fontSize: 12, color: accent.ink, fontWeight: 500, marginBottom: 6 }}>
                  {mod.ideal}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-muted)", lineHeight: 1.55 }}>
                  {mod.desc}
                </div>
              </div>
              );
            })}
          </div>

          {/* ── Bundle nudge ── */}
          <div
            style={{
              marginTop: "2rem",
              background: "var(--gold-light, #f5e9c8)",
              border: "1.5px solid #e0c870",
              borderRadius: 12,
              padding: "1.25rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#8a6510",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink, #14161d)" }}>
                  Applying for two related modules? They can be bundled.
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-muted, #4a4d5c)", lineHeight: 1.6, marginTop: 3 }}>
                  Three natural pairings run back-to-back as a single 6-hour session. If your expertise spans a pair, indicate that in your application and we&apos;ll discuss it.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Foundations + Retirement & Goals",
                "Equity + Debt & Fixed Income",
                "Asset Allocation + Investment Solutions",
              ].map((pair, i) => (
                <div
                  key={pair}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#8a6510",
                    background: "#fff",
                    border: "1px solid #e0c870",
                    borderRadius: 100,
                    padding: "4px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9496a1" }}>0{i + 1}</span>
                  {pair}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §9 HONEST SECTION (dark) ── */}
      <section style={{ background: "var(--ink)", padding: "4rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Gap 15: no section-sub paragraph — just pill + h2, then grid with marginTop */}
          <div style={{ textAlign: "center" }}>
            <DarkPill>Before you apply</DarkPill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--surface)",
                marginBottom: 12,
              }}
            >
              This works well for some people.
              <br />
              Not for everyone.
            </h2>
            {/* Gap 15: 'Before you apply, read this.' paragraph REMOVED */}
          </div>

          <div
            className="honest-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              maxWidth: 820,
              margin: "2.5rem auto 0",
            }}
          >
            {/* Good fit */}
            <div
              className="iq-animate iq-honest-card"
              style={{
                background: "rgba(42,107,42,0.15)",
                border: "1px solid rgba(42,107,42,0.25)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--green-on-ink)",
                  marginBottom: "0.75rem",
                }}
              >
                This is a good fit if you&hellip;
              </div>
              {GOOD_FIT.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.55,
                    marginBottom: "0.55rem",
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ stroke: "var(--green-on-ink)", flexShrink: 0, marginTop: 3 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>

            {/* Not a fit */}
            <div
              className="iq-animate iq-honest-card"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 12,
                padding: "1.25rem 1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: "0.75rem",
                }}
              >
                This is not for you if you&hellip;
              </div>
              {NOT_FIT.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.55,
                    marginBottom: "0.55rem",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: 3 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §10 DISCLOSURE SECTION ── */}
      <section style={{ background: "var(--surface)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>Transparency</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              How disclosure actually works.
              <br />
              Two tiers. Both on your terms.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              We want to be completely honest with you — because vague privacy promises help no one.
            </p>
          </div>

          <div
            className="disclosure-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
              maxWidth: 880,
              margin: "0 auto",
            }}
          >
            {/* Never disclosed */}
            <div
              className="iq-animate iq-disclosure-card"
              style={{
                background: "var(--surface-soft)",
                border: "1px solid rgba(20,18,12,0.10)",
                borderRadius: 12,
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  marginBottom: "0.5rem",
                }}
              >
                Public — Never disclosed
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: "0.75rem",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                What the world never sees
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-muted)",
                  lineHeight: 1.65,
                  marginBottom: "0.85rem",
                }}
              >
                Nothing that identifies you is ever displayed on our website, marketing, or any public-facing channel.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {NEVER_DISCLOSED.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 13,
                      color: "var(--ink-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 3, stroke: "var(--ink-faint)" }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Shared on confirm */}
            <div
              className="iq-animate iq-disclosure-card"
              style={{
                background: "var(--gold-light)",
                border: "1px solid var(--gold-border)",
                borderRadius: 12,
                padding: "1.75rem",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--gold-dark)",
                  marginBottom: "0.5rem",
                }}
              >
                Operational — Shared only when a session is confirmed
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: "0.75rem",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                What the session organiser receives
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-muted)",
                  lineHeight: 1.65,
                  marginBottom: "0.85rem",
                }}
              >
                Once you confirm availability for a session, the client-side organiser receives a brief professional profile — nothing more. Because you&apos;re providing explicit consent, we include your organisation or practice name to establish credibility upfront. If you are independent, we&apos;ll describe you as an independent practitioner in your domain.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {SHARED_ON_CONFIRM.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      fontSize: 13,
                      color: "var(--ink-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      style={{ flexShrink: 0, marginTop: 3, stroke: "var(--gold-dark)" }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Disclosure note */}
          <div
            style={{
              maxWidth: 880,
              margin: "1.5rem auto 0",
              background: "var(--surface-soft)",
              border: "1px solid rgba(20,18,12,0.10)",
              borderLeft: "3px solid var(--gold)",
              borderRadius: "0 12px 12px 0",
              padding: "1rem 1.25rem",
              fontSize: 13.5,
              color: "var(--ink-muted)",
              lineHeight: 1.65,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <svg
              width="15"
              height="15"
              fill="none"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 3, stroke: "var(--gold-dark)" }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              We&apos;ll be honest about one thing we can&apos;t fully control: once a session is confirmed, the organiser knows a practitioner is coming. Like any in-person engagement, your identity becomes known in the room.{" "}
              <strong style={{ color: "var(--ink)" }}>
                What we commit to is that this only happens after your explicit availability confirmation — and that we never facilitate direct client-to-practitioner contact outside our coordination layer.
              </strong>{" "}
              Your consent to this operational disclosure is captured during onboarding — and is entirely voluntary.
            </span>
          </div>
        </div>
      </section>

      {/* ── §11 APPLICATION FORM ── */}
      <section id="apply-form" style={{ background: "var(--surface-soft)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Pill>Apply</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Five minutes.
              <br />
              That&apos;s all we ask.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto",
                lineHeight: 1.65,
              }}
            >
              No formal interview, no audition. Just tell us who you are and what you&apos;d teach. We&apos;ll take it from there.
            </p>
          </div>
          {/* Gap 16: form card — no h2 'Apply to join iqcommune', no subtitle paragraph */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(20,18,12,0.18)",
              borderRadius: 20,
              padding: "2.5rem",
              boxShadow: "0 12px 48px rgba(0,0,0,0.06)",
            }}
          >
            <ApplicationForm />
          </div>
        </div>
      </section>

      {/* ── §12 PRACTITIONER FAQ ── */}
      <section style={{ background: "var(--surface)", padding: "5rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <Pill>FAQs</Pill>
            <h2
              className="iq-animate"
              style={{
                fontSize: "clamp(26px,3.8vw,40px)",
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Things practitioners ask.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-muted)",
                maxWidth: 520,
                margin: "0 auto 3rem",
                lineHeight: 1.65,
              }}
            >
              Honest answers — no fine print.
            </p>
          </div>

          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* ── §13 FOOTER ── */}
      <SiteFooter
        email="practitioners@iqcommune.com"
        tagline="practitioner network"
        top={
          <Link
            href="/"
            className="foot-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "rgba(255,255,255,0.50)",
              textDecoration: "none",
              marginBottom: "0.5rem",
              minHeight: 44,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to iqcommune
          </Link>
        }
      />

      {/* Card entrance animation — reveals .iq-animate elements on scroll. */}
      <RevealOnScroll />
    </main>
  );
}
