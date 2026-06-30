"use client";

import { useState } from "react";
import { PractitionerTable } from "@/components/admin/PractitionerTable";
import { SessionTable } from "@/components/admin/SessionTable";
import { RequestTable } from "@/components/admin/RequestTable";
import { PayoutTable } from "@/components/admin/PayoutTable";
import { AgreementTable, type Agreement } from "@/components/admin/AgreementTable";
import { PhotosTable } from "@/components/admin/PhotosTable";
import { SessionFormModal, type NewSession } from "@/components/admin/SessionFormModal";
import { PractitionerFormModal } from "@/components/admin/PractitionerFormModal";
import { PayoutFormModal } from "@/components/admin/PayoutFormModal";
import { CredentialsModal } from "@/components/admin/CredentialsModal";
import { GlobalSearchResults } from "@/components/admin/GlobalSearchResults";
import { useAdminUI } from "@/components/admin/AdminUIContext";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
};
type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: { name: string; upi_id: string | null; bank_account: string | null; bank_name: string | null } | null;
};
type PhotoRow = Database["public"]["Tables"]["photo_submissions"]["Row"] & {
  practitioner_name: string;
};

interface Counts {
  applied: number;
  empanelled: number;
  screeningDone?: number;
  agreementSent?: number;
  consentPending?: number;
  pendingRequests: number;
  pendingSessions: number;
  pendingPayouts: number;
  pendingAgreements?: number;
  pendingPayoutGross?: number;
  pendingPayoutNet?: number;
  paidPayoutGross?: number;
  paidPayoutNet?: number;
  nextSessionDate?: string;
  confirmedSessions?: number;
  completedSessions?: number;
  totalRequests?: number;
  matchedRequests?: number;
  confirmedRequests?: number;
  totalPractitioners?: number;
  totalSessions?: number;
  totalPayouts?: number;
  paidPayouts?: number;
  pendingPhotos?: number;
  approvedPhotos?: number;
  totalPhotos?: number;
  urgentPhotos?: number;
}

interface Props {
  practitioners: PractitionerRow[];
  sessions: SessionRow[];
  requests: RequestRow[];
  payouts: PayoutRow[];
  agreements: Agreement[];
  photos: PhotoRow[];
  email?: string;
  isSuperAdmin?: boolean;
}

// Gap 13 & 14: no trailing periods, correct titles
const TAB_META: Record<string, { title: string; subtitle: string }> = {
  requests:       { title: "Session Requests",      subtitle: "Incoming requests from iqcommune.com — review, match, and confirm" },
  practitioners:  { title: "Practitioner pipeline", subtitle: "Manage applications, onboarding, and empanelment" },
  sessions:       { title: "Sessions",              subtitle: "Create sessions, send confirmations, and track delivery" },
  agreements:     { title: "Agreements",            subtitle: "All signed empanelment agreements with timestamps" },
  payouts:        { title: "Payouts",               subtitle: "Track practitioner payments per session — mark paid after bank transfer" },
  photos:         { title: "Session Photos",          subtitle: "Review session photos submitted by practitioners — approve or delete within 30 days" },
  settings:       { title: "Settings",              subtitle: "Platform configuration and preferences" },
};

// Gap 9, 10, 17, 44, 45, 46, 47: stat definitions with delta sub-labels, correct casing, ink-colored numbers
type StatDef = {
  label: string;
  value: number | string;
  delta?: string;
  deltaRed?: boolean;
  /** When set, clicking the stat filters the tab's table to this value. */
  filter?: string;
};

function buildTabStats(counts: Counts): Record<string, StatDef[]> {
  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${n % 1000 !== 0 ? (n / 1000).toFixed(1) : (n / 1000).toFixed(0)}K` : `₹${n}`;

  return {
    requests: [
      { label: "Total requests",    value: counts.totalRequests ?? 0, filter: "all" },
      { label: "New — unreviewed",  value: counts.pendingRequests, delta: counts.pendingRequests > 0 ? "↑ needs action" : "All reviewed", deltaRed: counts.pendingRequests > 0, filter: "New" },
      { label: "Matched",           value: counts.matchedRequests ?? 0, filter: "Matched" },
      { label: "Confirmed",         value: counts.confirmedRequests ?? 0, filter: "Confirmed" },
    ],
    practitioners: [
      { label: "Total",            value: counts.totalPractitioners ?? 0, filter: "all" },
      { label: "Applied",          value: counts.applied, filter: "Applied" },
      { label: "Screening done",   value: counts.screeningDone ?? 0, delta: (counts.screeningDone ?? 0) > 0 ? "↑ action needed" : undefined, filter: "Screening Done" },
      { label: "Agreement sent",   value: counts.agreementSent ?? 0, filter: "Agreement Sent" },
      { label: "Empanelled",       value: counts.empanelled, delta: counts.empanelled > 0 ? "Active" : undefined, filter: "Empanelled" },
    ],
    sessions: [
      { label: "Total sessions",  value: counts.totalSessions ?? 0, filter: "All" },
      { label: "Upcoming",        value: counts.pendingSessions, delta: counts.nextSessionDate ? `Next: ${counts.nextSessionDate}` : undefined, filter: "Upcoming" },
      { label: "Consent pending", value: counts.consentPending ?? 0, delta: (counts.consentPending ?? 0) > 0 ? "↑ action needed" : undefined, deltaRed: (counts.consentPending ?? 0) > 0 },
      { label: "Completed",       value: counts.completedSessions ?? 0, filter: "Completed" },
    ],
    agreements: [],
    payouts: [
      { label: "Total paid out",    value: counts.paidPayoutGross ? fmt(counts.paidPayoutGross) : "—", filter: "Paid" },
      { label: "Pending payment",   value: counts.pendingPayoutGross ? fmt(counts.pendingPayoutGross) : (counts.pendingPayouts > 0 ? `${counts.pendingPayouts}` : "—"), delta: counts.pendingPayouts > 0 ? "↑ action needed" : undefined, deltaRed: counts.pendingPayouts > 0, filter: "Pending" },
      { label: "Sessions invoiced", value: counts.totalPayouts ?? 0, filter: "all" },
      { label: "Paid this month",   value: counts.paidPayoutNet ? fmt(counts.paidPayoutNet) : "—", filter: "Paid" },
    ],
    photos: [
      { label: "Total",            value: counts.totalPhotos ?? 0, filter: "all" },
      { label: "Pending review",   value: counts.pendingPhotos ?? 0, delta: (counts.pendingPhotos ?? 0) > 0 ? "↑ action needed" : "All reviewed", deltaRed: (counts.pendingPhotos ?? 0) > 0, filter: "Pending" },
      { label: "Approved",         value: counts.approvedPhotos ?? 0, filter: "Approved" },
      { label: "Expiring ≤ 7 days", value: counts.urgentPhotos ?? 0, delta: (counts.urgentPhotos ?? 0) > 0 ? "↑ review soon" : undefined, deltaRed: (counts.urgentPhotos ?? 0) > 0 },
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
  photos:        [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export photo submissions" },
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
  photos: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
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
        { label: "Agreements",       tab: "agreements",    badge: counts.pendingAgreements ?? 0, badgeBg: "#2a6b2a" },
        { label: "Photos",           tab: "photos",        badge: counts.pendingPhotos,           badgeBg: "#a32d2d" },
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
  border: "1px solid rgba(20,18,12,0.18)",
  borderRadius: 100,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--ink-soft)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// Gap 34: primary (dark) btn pill
const primaryBtnStyle: React.CSSProperties = {
  background: "var(--ink)",
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
  fontWeight: 600,
  color: "#14161d",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

// ─── Tab panel header component — Gap 6, 33 ───────────────────────────────────
// Renders the white .page-hdr bar (full-width, border-bottom) without duplicate title
function TabHeader({ tab, onAction, extraActions = [] }: { tab: string; onAction?: (label: string) => void; extraActions?: ActionButton[] }) {
  const meta = TAB_META[tab] ?? { title: tab, subtitle: "" };
  const actions = [...(TAB_ACTIONS[tab] ?? []), ...extraActions];

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid rgba(20,18,12,.10)",
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
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 1, marginBottom: 0 }}>
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
              <button key={btn.label} aria-label={btn.ariaLabel ?? btn.label} style={style} onClick={() => onAction?.(btn.label)}>
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
function TabStatsRow({ tab, counts, activeFilter, onStatClick }: { tab: string; counts: Counts; activeFilter?: string; onStatClick?: (filter: string) => void }) {
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
        background: "rgba(20,18,12,.10)",
        borderBottom: "1px solid rgba(20,18,12,.10)",
      }}
    >
      {stats.map((s) => {
        const clickable = !!s.filter && !!onStatClick;
        const isActive = !!s.filter && activeFilter === s.filter;
        return (
        // Clickable stat cells filter the table to s.filter
        <div
          key={s.label}
          onClick={clickable ? () => onStatClick!(s.filter!) : undefined}
          style={{ background: isActive ? "#f5e9c8" : "#fff", padding: "1rem 1.5rem", cursor: clickable ? "pointer" : "default", boxShadow: isActive ? "inset 0 -2px 0 #c9982a" : undefined }}
        >
          {/* Gap 9: fontSize 24, fontWeight 600, color ink (not accent) */}
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1 }}>
            {String(s.value)}
          </div>
          {/* Gap 10: fontSize 11, marginTop 3 */}
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>{s.label}</div>
          {/* Gap 17, 44: delta sub-label */}
          {s.delta && (
            <div style={{ fontSize: 11, color: s.deltaRed ? "#a32d2d" : "#2a6b2a", marginTop: 2 }}>
              {s.delta}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminConsoleView({ practitioners, sessions, requests, payouts, agreements, photos, email, isSuperAdmin = false }: Props) {
  const { globalSearch, setGlobalSearch, activeTab, setActiveTab } = useAdminUI();
  const [hovered, setHovered] = useState<string | null>(null);

  // Jump to a tab and exit the global-search overlay.
  const navigateToTab = (tab: string) => { setGlobalSearch(""); setActiveTab(tab); };

  // Per-tab table filters driven by clickable stat cards / table chips
  const [tabFilters, setTabFilters] = useState<Record<string, string>>({});
  const setTabFilter = (tab: string, filter: string) => setTabFilters((m) => ({ ...m, [tab]: filter }));

  // Header-action modals
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [practitionerModalOpen, setPractitionerModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  // Lifted data state — tables notify us via callbacks so counts stay reactive
  const [requestsData, setRequestsData] = useState(requests);
  const [sessionsData, setSessionsData] = useState(sessions);
  const [practitionersData, setPractitionersData] = useState(practitioners);
  const [payoutsData, setPayoutsData] = useState(payouts);
  const [photosData, setPhotosData] = useState(photos);
  const [agreementsData, setAgreementsData] = useState(agreements);

  // Derive counts from local state — updates instantly when any action fires
  const pendingPayoutList = payoutsData.filter((p) => p.status === "Pending");
  const paidPayoutList    = payoutsData.filter((p) => p.status === "Paid");
  const upcomingSessions  = sessionsData.filter((s) => s.status === "Upcoming");
  const nextSession       = upcomingSessions.sort((a, b) => a.session_date < b.session_date ? -1 : 1)[0];
  const counts: Counts = {
    applied:            practitionersData.filter((p) => p.status === "Applied").length,
    empanelled:         practitionersData.filter((p) => p.status === "Empanelled").length,
    screeningDone:      practitionersData.filter((p) => p.status === "Screening Done").length,
    agreementSent:      practitionersData.filter((p) => p.status === "Agreement Sent").length,
    pendingRequests:    requestsData.filter((r) => r.status === "New").length,
    pendingSessions:    upcomingSessions.length,
    pendingPayouts:     pendingPayoutList.length,
    pendingPayoutGross: pendingPayoutList.reduce((s, p) => s + p.gross_amount, 0),
    pendingPayoutNet:   pendingPayoutList.reduce((s, p) => s + p.net_amount, 0),
    paidPayoutGross:    paidPayoutList.reduce((s, p) => s + p.gross_amount, 0),
    paidPayoutNet:      paidPayoutList.reduce((s, p) => s + p.net_amount, 0),
    nextSessionDate:    nextSession?.session_date,
    confirmedSessions:  sessionsData.filter((s) => s.status === "Upcoming" && s.consent_status === "Consent given").length,
    completedSessions:  sessionsData.filter((s) => s.status === "Completed").length,
    consentPending:     sessionsData.filter((s) => s.consent_status === "Pending consent").length,
    totalRequests:      requestsData.length,
    matchedRequests:    requestsData.filter((r) => r.status === "Matched").length,
    confirmedRequests:  requestsData.filter((r) => r.status === "Confirmed").length,
    totalPractitioners: practitionersData.length,
    totalSessions:      sessionsData.length,
    totalPayouts:       payoutsData.length,
    paidPayouts:        paidPayoutList.length,
    // DB stores agreements awaiting signature as "Pending signature"; signed = "Active".
    pendingAgreements:  agreementsData.filter((a) => a.status === "Pending signature").length,
    totalPhotos:        photosData.length,
    pendingPhotos:      photosData.filter((p) => p.status === "Pending").length,
    approvedPhotos:     photosData.filter((p) => p.status === "Approved").length,
    urgentPhotos:       photosData.filter((p) => {
      if (p.status !== "Pending") return false;
      const days = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    }).length,
  };

  const handleRequestRowChange = (id: string, patch: { status?: string; assigned_to?: string | null }) => {
    setRequestsData((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const handlePractitionerStatusChange = (id: string, status: string) => {
    setPractitionersData((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };
  const handlePayoutRowChange = (id: string, patch: { status: string; paid_at: string; payment_method: string | null }) => {
    setPayoutsData((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  // ── Header actions: Export / + Add manually / + Create session ──
  function exportActiveTab() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (activeTab === "requests") {
      downloadCsv(`session-requests-${stamp}.csv`, toCsv(requestsData, [
        { key: "name", label: "Client" }, { key: "org", label: "Organisation" },
        { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
        { key: "topic", label: "Topic" }, { key: "audience_type", label: "Audience" },
        { key: "group_size", label: "Group size" }, { key: "min_commit", label: "Min commit" },
        { key: "venue", label: "Venue" }, { key: "preferred_dates", label: "Preferred dates" },
        { key: (r) => r.assigned_practitioner?.name ?? "", label: "Assigned to" },
        { key: "status", label: "Status" }, { key: "created_at", label: "Created" },
      ]));
    } else if (activeTab === "practitioners") {
      downloadCsv(`practitioners-${stamp}.csv`, toCsv(practitionersData, [
        { key: "ref_code", label: "Ref" }, { key: "name", label: "Name" },
        { key: "role", label: "Role" }, { key: "org", label: "Org" }, { key: "city", label: "City" },
        { key: (p) => (p.modules ?? []).join("; "), label: "Modules" },
        { key: "experience", label: "Experience" }, { key: "status", label: "Status" },
        { key: "created_at", label: "Applied" },
      ]));
    } else if (activeTab === "sessions") {
      downloadCsv(`sessions-${stamp}.csv`, toCsv(sessionsData, [
        { key: "ref_code", label: "Ref" }, { key: "module", label: "Module" },
        { key: (s) => s.practitioner?.name ?? "", label: "Practitioner" },
        { key: "session_date", label: "Date" }, { key: "start_time", label: "Start" }, { key: "end_time", label: "End" },
        { key: "venue", label: "Venue" }, { key: "audience_type", label: "Audience" },
        { key: "participants", label: "Pax" }, { key: "payout_amount", label: "Payout" },
        { key: "tds_rate", label: "TDS %" }, { key: "consent_status", label: "Consent" }, { key: "status", label: "Status" },
      ]));
    } else if (activeTab === "payouts") {
      downloadCsv(`payouts-${stamp}.csv`, toCsv(payoutsData, [
        { key: "invoice_ref", label: "Invoice" },
        { key: (p) => p.practitioner?.name ?? "", label: "Practitioner" },
        { key: (p) => p.session?.ref_code ?? "", label: "Session" },
        { key: "gross_amount", label: "Gross" }, { key: "net_amount", label: "Net" },
        { key: "payment_method", label: "Method" }, { key: "status", label: "Status" },
        { key: "paid_at", label: "Paid at" },
      ]));
    } else if (activeTab === "agreements") {
      downloadCsv(`agreements-${stamp}.csv`, toCsv(agreements, [
        { key: "practitioner_name", label: "Practitioner" }, { key: "ref_code", label: "Ref" },
        { key: "module", label: "Module" }, { key: "signed_at", label: "Signed on" },
        { key: "signature_method", label: "Method" }, { key: "status", label: "Status" },
      ]));
    } else if (activeTab === "photos") {
      downloadCsv(`photo-submissions-${stamp}.csv`, toCsv(photosData, [
        { key: "practitioner_name", label: "Practitioner" }, { key: "practitioner_ref", label: "Ref" }, { key: "session_ref", label: "Session" },
        { key: "module", label: "Module" }, { key: "city", label: "City" }, { key: "state", label: "State" },
        { key: "photo_count", label: "Photos" }, { key: "status", label: "Status" },
        { key: "submitted_at", label: "Submitted" }, { key: "expiry_date", label: "Expires" },
      ]));
    }
  }

  function handleHeaderAction(label: string) {
    if (label.includes("Create session")) setSessionModalOpen(true);
    else if (label.includes("Add manually")) setPractitionerModalOpen(true);
    else if (label.includes("Create payout")) setPayoutModalOpen(true);
    else if (label.includes("Credentials")) setCredentialsOpen(true);
    else if (label === "Export") exportActiveTab();
  }

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
          borderRight: "1px solid rgba(20,18,12,.10)",
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
              <div style={{ height: 1, background: "rgba(20,18,12,.10)", margin: "0.5rem 1.25rem" }} />
            )}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
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
                    color: isActive ? "#8a6510" : isHov ? "var(--ink)" : "var(--ink-soft)",
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
                        background: item.badgeBg ?? "var(--ink-faint)",
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
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem", borderTop: "1px solid rgba(20,18,12,0.10)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Admin User</div>
          {/* Gap 23: email defaults to hello@iqcommune.com */}
          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{email ?? "hello@iqcommune.com"}</div>
        </div>
      </aside>

      {/* ── Main — Gap 6, 7: no global padding; page-hdr is full-width ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "auto" }}>

        {/* ── Global search results (overrides tab panels while searching) ── */}
        {globalSearch.trim() ? (
          <GlobalSearchResults
            query={globalSearch}
            practitioners={practitionersData}
            sessions={sessionsData}
            requests={requestsData}
            onNavigate={navigateToTab}
          />
        ) : (
        <>
        {/* ── Tab panels ── */}

        {activeTab === "requests" && (
          <div>
            {/* Gap 6: white page-hdr with border-bottom */}
            <TabHeader tab="requests" onAction={handleHeaderAction} />
            {/* Gap 7: stats row is full-width, no horizontal padding */}
            <TabStatsRow tab="requests" counts={counts} activeFilter={tabFilters.requests ?? "all"} onStatClick={(f) => setTabFilter("requests", f)} />
            {/* Gap 7: table content in padded wrapper */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <RequestTable initialData={requestsData} practitioners={practitionersData} onRowChange={handleRequestRowChange} statusFilter={tabFilters.requests ?? "all"} />
            </div>
          </div>
        )}

        {activeTab === "practitioners" && (
          <div>
            <TabHeader tab="practitioners" onAction={handleHeaderAction} />
            <TabStatsRow tab="practitioners" counts={counts} activeFilter={tabFilters.practitioners ?? "all"} onStatClick={(f) => setTabFilter("practitioners", f)} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PractitionerTable initialData={practitionersData} onStatusChange={handlePractitionerStatusChange} filter={tabFilters.practitioners ?? "all"} onFilterChange={(f) => setTabFilter("practitioners", f)} isSuperAdmin={isSuperAdmin} onHardDeleted={(id) => setPractitionersData((prev) => prev.filter((p) => p.id !== id))} />
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div>
            <TabHeader tab="sessions" onAction={handleHeaderAction} />
            <TabStatsRow tab="sessions" counts={counts} activeFilter={tabFilters.sessions ?? "All"} onStatClick={(f) => setTabFilter("sessions", f)} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <SessionTable initialData={sessionsData} onNavigate={(tab) => setActiveTab(tab)} statusFilter={tabFilters.sessions ?? "All"} onStatusFilterChange={(f) => setTabFilter("sessions", f)} isSuperAdmin={isSuperAdmin} onHardDeleted={(id) => setSessionsData((prev) => prev.filter((s) => s.id !== id))} />
            </div>
          </div>
        )}

        {activeTab === "agreements" && (
          <div>
            <TabHeader tab="agreements" onAction={handleHeaderAction} />
            {/* Gap 27 & 28: AgreementTable no longer has stats or filter — pass through */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <AgreementTable initialData={agreementsData} isSuperAdmin={isSuperAdmin} onHardDeleted={(id) => setAgreementsData((prev) => prev.filter((a) => a.id !== id))} />
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div>
            <TabHeader
              tab="payouts"
              onAction={handleHeaderAction}
              extraActions={isSuperAdmin ? [{ label: "+ Create payout", variant: "primary" as const, ariaLabel: "Create a payout record directly" }] : []}
            />
            <TabStatsRow tab="payouts" counts={counts} activeFilter={tabFilters.payouts ?? "all"} onStatClick={(f) => setTabFilter("payouts", f)} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PayoutTable initialData={payoutsData} onRowChange={handlePayoutRowChange} statusFilter={tabFilters.payouts ?? "all"} isSuperAdmin={isSuperAdmin} onHardDeleted={(id) => setPayoutsData((prev) => prev.filter((p) => p.id !== id))} />
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            <TabHeader tab="photos" onAction={handleHeaderAction} />
            <TabStatsRow tab="photos" counts={counts} activeFilter={tabFilters.photos ?? "all"} onStatClick={(f) => setTabFilter("photos", f)} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PhotosTable
                initialData={photosData}
                statusFilter={tabFilters.photos ?? "All"}
                onStatusFilterChange={(f) => setTabFilter("photos", f)}
                onStatusChange={(id, status) =>
                  setPhotosData((prev) =>
                    status === "Deleted"
                      ? prev.filter((p) => p.id !== id)
                      : prev.map((p) => p.id === id ? { ...p, status } : p)
                  )
                }
              />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <TabHeader
              tab="settings"
              onAction={handleHeaderAction}
              extraActions={isSuperAdmin ? [{ label: "Credentials", variant: "ghost" as const, ariaLabel: "Manage admin account passwords" }] : []}
            />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid rgba(20,18,12,.10)",
                  borderRadius: 10,
                  padding: "2.5rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.65 }}>
                  Settings panel — coming soon.
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}

      </main>

      <SessionFormModal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        practitioners={practitionersData.map((p) => ({ id: p.id, name: p.name, email: p.email, status: p.status }))}
        onCreated={(s: NewSession) => { setSessionsData((prev) => [s, ...prev]); }}
      />
      <PractitionerFormModal
        open={practitionerModalOpen}
        onClose={() => setPractitionerModalOpen(false)}
        onCreated={(p) => { setPractitionersData((prev) => [p, ...prev]); }}
      />
      <PayoutFormModal
        open={payoutModalOpen}
        onClose={() => setPayoutModalOpen(false)}
        onCreated={(p) => { setPayoutsData((prev) => [p, ...prev]); }}
      />
      <CredentialsModal
        open={credentialsOpen}
        onClose={() => setCredentialsOpen(false)}
      />
    </div>
  );
}
