"use client";

import { useState } from "react";
import { PractitionerTable } from "@/components/admin/PractitionerTable";
import { SessionTable } from "@/components/admin/SessionTable";
import { RequestTable } from "@/components/admin/RequestTable";
import { PayoutTable } from "@/components/admin/PayoutTable";
import { AgreementTable, type Agreement } from "@/components/admin/AgreementTable";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};
type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string } | null;
  practitioner: { name: string } | null;
};

interface Counts {
  applied: number;
  empanelled: number;
  pendingRequests: number;
  pendingSessions: number;
  pendingPayouts: number;
  pendingAgreements?: number;
  pendingPayoutGross?: number;
  pendingPayoutNet?: number;
  confirmedSessions?: number;
  completedSessions?: number;
  totalRequests?: number;
  matchedRequests?: number;
  confirmedRequests?: number;
  totalPractitioners?: number;
  totalSessions?: number;
  totalPayouts?: number;
  paidPayouts?: number;
}

interface Props {
  practitioners: PractitionerRow[];
  sessions: SessionRow[];
  requests: RequestRow[];
  payouts: PayoutRow[];
  agreements: Agreement[];
  counts: Counts;
  email?: string;
}

// Gap 13 & 14: no trailing periods, correct titles
const TAB_META: Record<string, { title: string; subtitle: string }> = {
  requests:       { title: "Session Requests",      subtitle: "Incoming requests from iqcommune.com — review, match, and confirm" },
  practitioners:  { title: "Practitioner pipeline", subtitle: "Manage applications, onboarding, and empanelment" },
  sessions:       { title: "Sessions",              subtitle: "Create sessions, send confirmations, and track delivery" },
  agreements:     { title: "Agreements",            subtitle: "All signed empanelment agreements with timestamps" },
  payouts:        { title: "Payouts",               subtitle: "Track practitioner payments per session — mark paid after bank transfer" },
  settings:       { title: "Settings",              subtitle: "Platform configuration and preferences" },
};

// Gap 9, 10, 17, 44, 45, 46, 47: stat definitions with delta sub-labels, correct casing, ink-colored numbers
type StatDef = {
  label: string;
  value: number | string;
  delta?: string;
  deltaRed?: boolean;
};

function buildTabStats(counts: Counts): Record<string, StatDef[]> {
  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

  return {
    requests: [
      { label: "Total requests",    value: counts.totalRequests ?? 0 },
      { label: "New — unreviewed",  value: counts.pendingRequests, delta: counts.pendingRequests > 0 ? "↑ needs action" : "All reviewed", deltaRed: counts.pendingRequests > 0 },
      { label: "Matched",           value: counts.matchedRequests ?? 0 },
      { label: "Confirmed",         value: counts.confirmedRequests ?? 0 },
    ],
    practitioners: [
      { label: "Total",            value: counts.totalPractitioners ?? 0 },
      { label: "Applied",          value: counts.applied },
      { label: "Screening done",   value: 0, delta: counts.applied > 0 ? "↑ action needed" : undefined },
      { label: "Agreement sent",   value: 0 },
      { label: "Empanelled",       value: counts.empanelled, delta: counts.empanelled > 0 ? "Active" : undefined },
    ],
    sessions: [
      { label: "Total sessions",  value: counts.totalSessions ?? 0 },
      { label: "Upcoming",        value: counts.confirmedSessions ?? counts.pendingSessions, delta: counts.confirmedSessions ? `${counts.confirmedSessions} scheduled` : undefined },
      { label: "Consent pending", value: 0, delta: "↑ action needed", deltaRed: true },
      { label: "Completed",       value: counts.completedSessions ?? 0 },
    ],
    agreements: [],
    payouts: [
      { label: "Total paid out",    value: counts.paidPayouts ?? 0 },
      { label: "Pending payment",   value: counts.pendingPayouts, delta: counts.pendingPayoutGross ? fmt(counts.pendingPayoutGross) + " gross" : counts.pendingPayouts > 0 ? "↑ action needed" : undefined, deltaRed: counts.pendingPayouts > 0 },
      { label: "Sessions invoiced", value: counts.totalPayouts ?? 0 },
      { label: "Net pending",       value: counts.pendingPayoutNet ? fmt(counts.pendingPayoutNet) : "—" },
    ],
    settings: [],
  };
}

// Gap 15: corrected button labels, removed 'Draft message', correct variants, sessions only 'Create session'
type ActionButton = {
  label: string;
  variant: "ghost" | "primary" | "gold";
  ariaLabel?: string;
  icon?: "plus";
};
const TAB_ACTIONS: Record<string, ActionButton[]> = {
  // Gap 15: only 'Export', no 'Draft message'
  requests:      [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export session requests" },
  ],
  // Gap 15: 'Export' (not 'Export CSV'), 'Add manually' (dark), no 'Draft message'
  practitioners: [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export practitioners" },
    { label: "+ Add manually",variant: "primary", ariaLabel: "Add a practitioner manually" },
  ],
  // Gap 15: sessions only 'Create session' with gold style
  sessions:      [
    { label: "+ Create session", variant: "gold", ariaLabel: "Create a new session", icon: "plus" },
  ],
  // Gap 15: agreements only 'Export'
  agreements:    [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export agreements" },
  ],
  // Gap 15: payouts only 'Export' (no 'Mark paid')
  payouts:       [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export payouts" },
  ],
  settings:      [],
};

// Gap 20, 21, 22: icons 16x16, strokeWidth 1.8, settings = broadcast icon
const SIDEBAR_ICONS: Record<string, React.ReactNode> = {
  requests: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  practitioners: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  sessions: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  agreements: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  payouts: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  // Gap 20: broadcast/signal icon, not gear
  settings: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
};

type SidebarItem = { label: string; tab: string; badge?: number; badgeBg?: string };
type SidebarSection = { heading: string; items: SidebarItem[] };

function buildSections(counts: Counts): SidebarSection[] {
  return [
    {
      heading: "Pipeline",
      items: [
        { label: "Session Requests", tab: "requests",      badge: counts.pendingRequests,   badgeBg: "#a32d2d" },
        { label: "Practitioners",    tab: "practitioners", badge: counts.applied,            badgeBg: "#c9982a" },
        { label: "Sessions",         tab: "sessions",      badge: counts.pendingSessions,    badgeBg: "#2a6b2a" },
        // Gap 18: Agreements badge green
        { label: "Agreements",       tab: "agreements",    badge: counts.pendingAgreements ?? 4, badgeBg: "#2a6b2a" },
      ],
    },
    {
      heading: "Finance",
      items: [
        { label: "Payouts", tab: "payouts", badge: counts.pendingPayouts, badgeBg: "#a32d2d" },
      ],
    },
    {
      heading: "System",
      items: [
        { label: "Settings", tab: "settings" },
      ],
    },
  ];
}

// ─── Style helpers ────────────────────────────────────────────────────────────

// Gap 34: border-radius 100 (pill) for all buttons
const ghostBtnStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(15,17,23,0.18)",
  borderRadius: 100,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#4a4d5c",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// Gap 34: primary (dark) btn pill
const primaryBtnStyle: React.CSSProperties = {
  background: "#0f1117",
  border: "none",
  borderRadius: 100,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// Gap 15: sessions 'Create session' uses gold
const goldBtnStyle: React.CSSProperties = {
  background: "#c9982a",
  border: "none",
  borderRadius: 100,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// ─── Tab panel header component — Gap 6, 33 ───────────────────────────────────
// Renders the white .page-hdr bar (full-width, border-bottom) without duplicate title
function TabHeader({ tab }: { tab: string }) {
  const meta = TAB_META[tab] ?? { title: tab, subtitle: "" };
  const actions = TAB_ACTIONS[tab] ?? [];

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid rgba(15,17,23,.10)",
        padding: "1.25rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "#0f1117",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ fontSize: 13, color: "#9496a1", marginTop: 1, marginBottom: 0 }}>
          {meta.subtitle}
        </p>
      </div>

      {actions.length > 0 && (
        <div style={{ display: "flex", gap: "0.65rem" }}>
          {actions.map((btn) => {
            const style =
              btn.variant === "gold"    ? goldBtnStyle :
              btn.variant === "primary" ? primaryBtnStyle :
              ghostBtnStyle;
            return (
              <button key={btn.label} aria-label={btn.ariaLabel ?? btn.label} style={style}>
                {btn.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Per-tab stats row — Gap 9, 10, 11, 12, 17, 44, 45, 46, 47 ──────────────
// Full-width, no outer border/radius, background acts as gap colour
function TabStatsRow({ tab, counts }: { tab: string; counts: Counts }) {
  const allStats = buildTabStats(counts);
  const stats = allStats[tab];
  if (!stats || stats.length === 0) return null;

  return (
    // Gap 12: no border, no borderRadius; background = border gap colour; borderBottom only
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length},1fr)`,
        gap: 1,
        background: "rgba(15,17,23,.10)",
        borderBottom: "1px solid rgba(15,17,23,.10)",
      }}
    >
      {stats.map((s) => (
        // Gap 11: clickable stat cells with cursor:pointer; no onClick logic wired (placeholder)
        <div
          key={s.label}
          style={{ background: "#fff", padding: "1rem 1.5rem", cursor: "pointer" }}
        >
          {/* Gap 9: fontSize 24, fontWeight 600, color ink (not accent) */}
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "#0f1117", lineHeight: 1 }}>
            {String(s.value)}
          </div>
          {/* Gap 10: fontSize 11, marginTop 3 */}
          <div style={{ fontSize: 11, color: "#9496a1", marginTop: 3 }}>{s.label}</div>
          {/* Gap 17, 44: delta sub-label */}
          {s.delta && (
            <div style={{ fontSize: 11, color: s.deltaRed ? "#a32d2d" : "#2a6b2a", marginTop: 2 }}>
              {s.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Practitioners filter bar — Gap 16 ───────────────────────────────────────
type PrFilter = "all" | "Applied" | "Under Review" | "Screening Done" | "Agreement Sent" | "Empanelled" | "Rejected";

function PractitionerFilterBar({
  active,
  onChange,
}: {
  active: PrFilter;
  onChange: (v: PrFilter) => void;
}) {
  const chips: { label: string; value: PrFilter }[] = [
    { label: "All",             value: "all" },
    { label: "Applied",         value: "Applied" },
    { label: "Under review",    value: "Under Review" },
    { label: "Screening done",  value: "Screening Done" },
    { label: "Agreement sent",  value: "Agreement Sent" },
    { label: "Empanelled",      value: "Empanelled" },
    { label: "Rejected",        value: "Rejected" },
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid rgba(15,17,23,.10)",
        padding: ".75rem 1.75rem",
        display: "flex",
        alignItems: "center",
        gap: ".5rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 12, color: "#9496a1", marginRight: 4 }}>Filter:</span>
      {chips.map((c) => {
        const isActive = active === c.value;
        return (
          <div
            key={c.value}
            onClick={() => onChange(c.value)}
            style={{
              padding: "5px 14px",
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: isActive ? "1px solid #0f1117" : "1px solid rgba(15,17,23,.18)",
              cursor: "pointer",
              background: isActive ? "#0f1117" : "#fff",
              color: isActive ? "#fff" : "#4a4d5c",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminConsoleView({ practitioners, sessions, requests, payouts, agreements, counts, email }: Props) {
  const [activeTab, setActiveTab] = useState<string>("practitioners");
  const [hovered, setHovered] = useState<string | null>(null);
  const [prFilter, setPrFilter] = useState<PrFilter>("all");
  const [contactModal, setContactModal] = useState<{
    open: boolean;
    recipientName?: string;
    recipientEmail?: string;
    defaultChannel?: "email" | "whatsapp";
  }>({ open: false });

  const sections = buildSections(counts);


  return (
    // Gap 7: no global padding on main; layout wrapper
    <div style={{ display: "flex", paddingTop: 64, minHeight: "100vh", background: "#f8f7f4" }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: "#ffffff",
          borderRight: "1px solid rgba(15,17,23,.10)",
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sections.map((section, si) => (
          <div key={section.heading}>
            {si > 0 && (
              <div style={{ height: 1, background: "rgba(15,17,23,.10)", margin: "0.5rem 1.25rem" }} />
            )}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9496a1",
                padding: "1.25rem 1.25rem 0.4rem",
              }}
            >
              {section.heading}
            </div>
            {section.items.map((item) => {
              const isActive = activeTab === item.tab;
              const isHov = hovered === item.tab && !isActive;
              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  onMouseEnter={() => setHovered(item.tab)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    // Gap 35: gap 10
                    gap: 10,
                    padding: "0.6rem 1.25rem",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#8a6510" : isHov ? "#0f1117" : "#4a4d5c",
                    cursor: "pointer",
                    background: isActive ? "#f5e9c8" : isHov ? "#f8f7f4" : "transparent",
                    border: "none",
                    borderLeft: `2.5px solid ${isActive ? "#c9982a" : "transparent"}`,
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  {SIDEBAR_ICONS[item.tab]}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        background: item.badgeBg ?? "#9496a1",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: 100,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Sidebar footer — Gap 23: no avatar, just name + email lines */}
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem", borderTop: "1px solid rgba(15,17,23,0.10)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1117" }}>Admin User</div>
          {/* Gap 23: email defaults to hello@iqcommune.com */}
          <div style={{ fontSize: 11, color: "#9496a1" }}>{email ?? "hello@iqcommune.com"}</div>
        </div>
      </aside>

      {/* ── Main — Gap 6, 7: no global padding; page-hdr is full-width ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* ── Tab panels ── */}

        {activeTab === "requests" && (
          <div>
            {/* Gap 6: white page-hdr with border-bottom */}
            <TabHeader tab="requests" />
            {/* Gap 7: stats row is full-width, no horizontal padding */}
            <TabStatsRow tab="requests" counts={counts} />
            {/* Gap 7: table content in padded wrapper */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <RequestTable initialData={requests} practitioners={practitioners} />
            </div>
          </div>
        )}

        {activeTab === "practitioners" && (
          <div>
            <TabHeader tab="practitioners" />
            <TabStatsRow tab="practitioners" counts={counts} />
            {/* Gap 16: filter bar */}
            <PractitionerFilterBar active={prFilter} onChange={setPrFilter} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PractitionerTable initialData={practitioners} />
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div>
            <TabHeader tab="sessions" />
            <TabStatsRow tab="sessions" counts={counts} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <SessionTable initialData={sessions} onNavigate={(tab) => setActiveTab(tab)} />
            </div>
          </div>
        )}

        {activeTab === "agreements" && (
          <div>
            <TabHeader tab="agreements" />
            {/* Gap 27 & 28: AgreementTable no longer has stats or filter — pass through */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <AgreementTable initialData={agreements} />
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div>
            <TabHeader tab="payouts" />
            <TabStatsRow tab="payouts" counts={counts} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PayoutTable initialData={payouts} />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <TabHeader tab="settings" />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(15,17,23,.10)",
                  borderRadius: 10,
                  padding: "2.5rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "#9496a1", lineHeight: 1.65 }}>
                  Settings panel — coming soon.
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <ContactDraftModal
        open={contactModal.open}
        onClose={() => setContactModal({ open: false })}
        recipientName={contactModal.recipientName}
        recipientEmail={contactModal.recipientEmail}
        defaultChannel={contactModal.defaultChannel}
      />
    </div>
  );
}
