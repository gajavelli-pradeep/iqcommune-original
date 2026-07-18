"use client";

import { useState } from "react";
import { PractitionerTable } from "@/components/admin/PractitionerTable";
import { SessionTable } from "@/components/admin/SessionTable";
import { RequestTable } from "@/components/admin/RequestTable";
import { PayoutTable } from "@/components/admin/PayoutTable";
import { AgreementTable, type Agreement } from "@/components/admin/AgreementTable";
import { PhotosTable } from "@/components/admin/PhotosTable";
import { ConsentTable, type ConfirmationRow } from "@/components/admin/ConsentTable";
import { ConsentFormModal } from "@/components/admin/ConsentFormModal";
import { ReassignConsentModal } from "@/components/admin/ReassignConsentModal";
import { MasterDataTable } from "@/components/admin/MasterDataTable";
import { RolesPermissions } from "@/components/admin/RolesPermissions";
import { TeamAccessTable } from "@/components/admin/TeamAccessTable";
import { InviteTeamMember } from "@/components/admin/InviteTeamMember";
import { SessionFormModal, type NewSession } from "@/components/admin/SessionFormModal";
import { PractitionerFormModal } from "@/components/admin/PractitionerFormModal";
import { PayoutFormModal } from "@/components/admin/PayoutFormModal";
import { RequestFormModal } from "@/components/admin/RequestFormModal";
import { PayoutEditModal } from "@/components/admin/PayoutEditModal";
import { AgreementEditModal } from "@/components/admin/AgreementEditModal";
import { CredentialsModal } from "@/components/admin/CredentialsModal";
import { TrashModal } from "@/components/admin/TrashModal";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { ActivityLogView } from "@/components/admin/ActivityLogView";
import { GlobalSearchResults } from "@/components/admin/GlobalSearchResults";
import { useAdminUI } from "@/components/admin/AdminUIContext";
import { useRealtimeList, useRealtimeChannel } from "@/lib/hooks/use-realtime-list";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { Database } from "@/lib/supabase/database.types";

type SubsectionAverages = Database["public"]["Views"]["practitioner_subsection_averages"]["Row"];
type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"] & {
  subsection_averages?: SubsectionAverages | null;
};
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
  photos_submitted?: boolean;
  payout_id?: string | null;
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
  featured: boolean;
};

// Map a joined session row into the NewSession shape the edit modal expects.
function toNewSession(row: SessionRow): NewSession {
  return {
    id:              row.id,
    ref_code:        row.ref_code,
    module:          row.module,
    practitioner_id: row.practitioner_id,
    session_date:    row.session_date,
    start_time:      row.start_time,
    end_time:        row.end_time,
    venue:           row.venue,
    audience_type:   row.audience_type,
    participants:    row.participants,
    payout_amount:   row.payout_amount,
    tds_applicable:  row.tds_applicable,
    tds_rate:        row.tds_rate,
    consent_status:  row.consent_status,
    status:          row.status,
    request_id:      row.request_id,
    created_at:      row.created_at,
    updated_at:      row.updated_at,
    deleted_at:      row.deleted_at,
    practitioner:    row.practitioner,
    payout_id:       null,
  };
}

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
  nextSessionDate?: string;
  confirmedSessions?: number;
  completedSessions?: number;
  totalRequests?: number;
  confirmedRequests?: number;
  totalPractitioners?: number;
  totalSessions?: number;
  totalPayouts?: number;
  paidPayouts?: number;
  pendingPhotos?: number;
  uploadedPhotos?: number;
  totalPhotos?: number;
  urgentPhotos?: number;
  awaitingConsent?: number;
  consentReceived?: number;
  totalConfirmations?: number;
}

interface Props {
  practitioners: PractitionerRow[];
  sessions: SessionRow[];
  requests: RequestRow[];
  payouts: PayoutRow[];
  agreements: Agreement[];
  photos: PhotoRow[];
  confirmations: ConfirmationRow[];
  email?: string;
  isGlobalAdmin?: boolean;
  /** SA-controlled flag — whether regular admins may manage the gallery. */
  galleryAdminAccess?: boolean;
  /**
   * Read-only User tier: view all data + download/export only. Strips every
   * mutation affordance and limits the console to the six data tabs. The
   * data-mutating APIs stay admin-gated (403 for a user) as defense in depth.
   */
  readOnly?: boolean;
}

// Titles + subtitles verbatim from the V5 mockup (iqcommune-admin-console.html
// panel <h1>/<p> headers) — 100% match mandate. See ADMIN-V5-SPECDIFF.md.
const TAB_META: Record<string, { title: string; subtitle: string }> = {
  requests:       { title: "Session Requests",      subtitle: "Incoming requests from iqcommune.com — assign a practitioner to confirm" },
  practitioners:  { title: "Practitioner pipeline", subtitle: "Manage applications, onboarding, and empanelment" },
  sessions:       { title: "Session Details",       subtitle: "Track delivery status — sessions are created automatically when a practitioner is assigned to a request" },
  agreements:     { title: "Agreements",            subtitle: "All empanelment agreements — signed and awaiting signature" },
  consent:        { title: "Session Consent",       subtitle: "Generate the per-session revenue confirmation and track practitioner consent." },
  payouts:        { title: "Payouts",               subtitle: "Track practitioner payments per session — mark paid after bank transfer. These records are permanent and can't be deleted; corrections happen via Revert (Global Admin) instead." },
  photos:         { title: "Session Photos",        subtitle: "Track photo uploads from practitioners after each completed session — view, download, or delete." },
  gallery:        { title: "Gallery",               subtitle: "Curate photos for “Sessions in the room” on the main landing page. Standalone — not linked to practitioners, sessions, or requests." },
  activity:       { title: "Activity",              subtitle: "A running log of actions taken across the console — visible to Global Admins only." },
  settings:       { title: "Settings",              subtitle: "Manage team access and review platform-wide permissions." },
};

// Gap 15: corrected button labels, removed 'Draft message', correct variants, sessions only 'Create session'
type ActionButton = {
  label: string;
  variant: "ghost" | "primary" | "gold";
  ariaLabel?: string;
  icon?: "plus";
};
// V5-MATCH: header buttons trimmed to exactly what the mockup shows.
// The manual add/create buttons are re-enablable improvements — see ADMIN-V5-SPECDIFF.md.
const TAB_ACTIONS: Record<string, ActionButton[]> = {
  // V5: Session Requests header has Export only.
  requests:      [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export session requests" },
    // { label: "+ Add request", variant: "primary", ariaLabel: "Log a session request manually" },
  ],
  // V5: Practitioners header has Export only.
  practitioners: [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export practitioners" },
    // { label: "+ Add manually",variant: "primary", ariaLabel: "Add a practitioner manually" },
  ],
  // V5: Session Details header has no action buttons.
  sessions:      [
    // { label: "+ Create session", variant: "gold", ariaLabel: "Create a new session", icon: "plus" },
  ],
  // V5: agreements only 'Export'
  agreements:    [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export agreements" },
  ],
  // V5: the "Generate a new confirmation" form is inline on the tab, not a header button.
  consent:       [],
  // V5: payouts only 'Export' (no 'Mark paid')
  payouts:       [
    { label: "Export",        variant: "ghost",   ariaLabel: "Export payouts" },
  ],
  // V5: Photos header button reads "Export log".
  photos:        [
    { label: "Export log",    variant: "ghost",   ariaLabel: "Export photo submissions" },
  ],
  // V5: Activity header has an "Export log" button (Global-Admin-only tab).
  activity:      [
    { label: "Export log",    variant: "ghost",   ariaLabel: "Export activity log" },
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
  consent: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>
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
  gallery: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  activity: (
    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.7 }}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
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

function buildSections(counts: Counts, galleryVisible: boolean, isGlobalAdmin: boolean): SidebarSection[] {
  // V5 sidebar grouping (technical-handoff §1): four sections reflecting how the
  // business thinks about these tabs — Practitioner Management / Session Pipeline /
  // Finance / System.
  const practitionerMgmt: SidebarSection = {
    heading: "Practitioner Management",
    items: [
      { label: "Practitioners", tab: "practitioners", badge: counts.applied,                badgeBg: "#c9982a" },
      // Gap 18: Agreements badge green
      { label: "Agreements",    tab: "agreements",    badge: counts.pendingAgreements ?? 0, badgeBg: "#2a6b2a" },
    ],
  };
  const sessionPipeline: SidebarSection = {
    heading: "Session Pipeline",
    // Spec order: Session Requests → Session Consent → Session Details → Photos.
    items: [
      { label: "Session Requests", tab: "requests", badge: counts.pendingRequests, badgeBg: "#a32d2d" },
      // V5 sidebar: every role sees Session Consent (read-only tier gets it view-only).
      // V5 badge colours: Session Consent = red, Photos = gold.
      { label: "Session Consent", tab: "consent", badge: counts.awaitingConsent ?? 0, badgeBg: "#a32d2d" },
      // "Session Details" is the V5 user-facing label; the internal tab id stays "sessions".
      { label: "Session Details", tab: "sessions", badge: counts.pendingSessions, badgeBg: "#2a6b2a" },
      { label: "Photos",          tab: "photos",   badge: counts.pendingPhotos,   badgeBg: "#c9982a" },
    ],
  };
  const finance: SidebarSection = {
    heading: "Finance",
    items: [
      { label: "Payouts", tab: "payouts", badge: counts.pendingPayouts, badgeBg: "#a32d2d" },
    ],
  };
  // V5 sidebar: all roles see the System section (Settings + Gallery); only
  // Activity is Global-Admin-only. The read-only User sees Settings and Gallery
  // view-only (edit surfaces inside them are stripped by their own readOnly mode).
  return [
    practitionerMgmt,
    sessionPipeline,
    finance,
    {
      heading: "System",
      items: [
        ...(isGlobalAdmin ? [{ label: "Activity", tab: "activity" }] : []),
        { label: "Settings", tab: "settings" },
        ...(galleryVisible ? [{ label: "Gallery", tab: "gallery" }] : []),
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
function TabHeader({ tab, onAction, extraActions = [], readOnly = false }: { tab: string; onAction?: (label: string) => void; extraActions?: ActionButton[]; readOnly?: boolean }) {
  const meta = TAB_META[tab] ?? { title: tab, subtitle: "" };
  // Read-only tier keeps only the download actions ("Export" / "Export log");
  // every create/mutation header button is stripped.
  const actions = readOnly
    ? (TAB_ACTIONS[tab] ?? []).filter((a) => a.label === "Export" || a.label === "Export log")
    : [...(TAB_ACTIONS[tab] ?? []), ...extraActions];

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

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminConsoleView({ practitioners, sessions, requests, payouts, agreements, photos, confirmations, email, isGlobalAdmin: realIsGlobalAdmin = false, galleryAdminAccess = true, readOnly: realReadOnly = false }: Props) {
  const { globalSearch, setGlobalSearch, activeTab: rawActiveTab, setActiveTab, viewAs, sidebarOpen, setSidebarOpen } = useAdminUI();

  // V5 "Viewing as" preview — downgrade-only. Only a real global admin can
  // preview a lower scope; every other tier ignores viewAs, so it can never
  // grant more access than the account already has. Server perms are unchanged.
  const preview = realIsGlobalAdmin ? viewAs : "global";
  const isGlobalAdmin = realIsGlobalAdmin && preview === "global";
  const readOnly = realReadOnly || preview === "user";
  const [hovered, setHovered] = useState<string | null>(null);

  // Jump to a tab and exit the global-search overlay.
  const navigateToTab = (tab: string) => { setGlobalSearch(""); setActiveTab(tab); };

  // Per-tab table filters driven by clickable stat cards / table chips

  // Header-action modals
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [practitionerModalOpen, setPractitionerModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [teamReloadKey, setTeamReloadKey] = useState(0);
  const [trashOpen, setTrashOpen] = useState(false);
  // Gallery visibility: global admins always; a regular admin only when the SA has
  // granted THIS account access (`galleryAdminAccess` prop = the signed-in admin's
  // own app_metadata.gallery_access). Per-admin grants are managed in Credentials.
  const galleryVisible = isGlobalAdmin || galleryAdminAccess;

  // The URL can carry any ?tab= value (deep link / refresh). Fall back to the
  // default if it names a tab this user can't see (Activity = SA-only, Gallery
  // gated) so a hand-crafted link never renders a blank panel.
  // V5: every role reaches every tab except Activity (Global-Admin-only). The
  // read-only User sees the same tabs, just view-only.
  const availableTabs = new Set<string>([
    "requests", "practitioners", "sessions", "agreements", "consent", "payouts", "photos", "settings",
    ...(galleryVisible ? ["gallery"] : []),
    ...(isGlobalAdmin ? ["activity"] : []),
  ]);
  const activeTab = availableTabs.has(rawActiveTab) ? rawActiveTab : "practitioners";

  // Global-admin edit modals (null = closed)
  const [editingPractitioner, setEditingPractitioner] = useState<PractitionerRow | null>(null);
  const [editingSession, setEditingSession] = useState<NewSession | null>(null);
  const [editingRequest, setEditingRequest] = useState<RequestRow | null>(null);
  const [editingPayout, setEditingPayout] = useState<PayoutRow | null>(null);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);

  // Lifted, LIVE data state — every core dataset streams via Supabase Realtime
  // (useRealtimeList is a drop-in for useState): rows insert/update/delete in
  // place, no refresh. `transform` rebuilds joined/derived fields on INSERT;
  // UPDATE merges only raw columns so joins already on a row survive. Order
  // matters — sessions/payouts/agreements read practitioners/sessions to rebuild
  // their joins, so practitioners is declared first.
  const [practitionersData, setPractitionersData] = useRealtimeList<PractitionerRow>({
    table: "practitioners",
    initial: practitioners,
    transform: (raw) => ({ ...(raw as unknown as PractitionerRow), subsection_averages: null }),
    keep: (r) => !r.deleted_at,
  });

  const [sessionsData, setSessionsData] = useRealtimeList<SessionRow>({
    table: "sessions",
    initial: sessions,
    transform: (raw) => {
      const r = raw as unknown as SessionRow;
      const p = practitionersData.find((x) => x.id === r.practitioner_id);
      return { ...r, practitioner: p ? { name: p.name, email: p.email } : null, session_feedback: [], photos_submitted: false };
    },
    keep: (r) => !r.deleted_at,
  });

  const [payoutsData, setPayoutsData] = useRealtimeList<PayoutRow>({
    table: "payouts",
    initial: payouts,
    transform: (raw) => {
      const r = raw as unknown as PayoutRow;
      const p = practitionersData.find((x) => x.id === r.practitioner_id);
      const s = sessionsData.find((x) => x.id === r.session_id);
      return {
        ...r,
        practitioner: p ? { name: p.name, upi_id: p.upi_id, bank_account: p.bank_account, bank_name: p.bank_name } : null,
        session: s ? { ref_code: s.ref_code, module: s.module, session_date: s.session_date } : null,
      };
    },
    keep: (r) => !r.deleted_at,
  });

  const [agreementsData, setAgreementsData] = useRealtimeList<Agreement>({
    table: "agreements",
    initial: agreements,
    transform: (raw) => {
      const r = raw as unknown as Agreement;
      const p = practitionersData.find((x) => x.id === (raw as { practitioner_id?: string }).practitioner_id);
      return { ...r, practitioner_name: p?.name ?? "—", practitioner_role: p?.role ?? "—" };
    },
    keep: (r) => !r.deleted_at,
  });

  const [requestsData, setRequestsData] = useRealtimeList<RequestRow>({
    table: "session_requests",
    initial: requests,
    // A new request arrives unassigned; on UPDATE only raw columns merge, so an
    // existing row's joined practitioner name is preserved.
    transform: (raw) => ({ ...(raw as unknown as RequestRow), assigned_practitioner: null }),
    keep: (r) => !r.deleted_at,
  });

  const [photosData, setPhotosData] = useRealtimeList<PhotoRow>({
    table: "photo_submissions",
    initial: photos,
    // Derive the practitioner name from the ref, matching the server-side mapping.
    transform: (raw) => {
      const r = raw as unknown as PhotoRow;
      const name = practitionersData.find((p) => p.ref_code === r.practitioner_ref)?.name;
      // A brand-new upload is never featured yet; UPDATEs merge raw columns and
      // leave the derived `featured` flag on the existing row intact.
      return { ...r, practitioner_name: name ?? r.practitioner_ref, featured: false };
    },
  });

  // Confirmations stream live (0028 adds the table to the realtime publication + an
  // admin SELECT policy). Optimistic insert/patch still work — useRealtimeList is a
  // drop-in for useState and dedupes by id, so the generate/consent events reconcile.
  const [confirmationsData, setConfirmationsData] = useRealtimeList<ConfirmationRow>({
    table: "confirmations",
    initial: confirmations,
    transform: (raw) => {
      const r = raw as unknown as ConfirmationRow;
      const p = practitionersData.find((x) => x.id === r.practitioner_id);
      return { ...r, practitioner: p ? { name: p.name, email: p.email } : null };
    },
    keep: (r) => !r.deleted_at,
  });
  const handleConfirmationRowChange = (id: string, patch: Partial<ConfirmationRow>) => {
    setConfirmationsData((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const confirmedSessionIds = confirmationsData.filter((c) => c.status !== "Superseded").map((c) => c.session_id);

  // Global-Admin practitioner replacement on an upcoming session: supersede the old
  // confirmation locally, prepend the fresh one, and move the session to the new
  // practitioner (back to Pending consent). Realtime reconciles by id.
  const [reassigning, setReassigning] = useState<ConfirmationRow | null>(null);
  const handleReassigned = (newRow: ConfirmationRow, supersededIds: string[], newPractitionerId: string) => {
    setConfirmationsData((prev) => [
      newRow,
      ...prev.map((c) => (supersededIds.includes(c.id) ? { ...c, status: "Superseded" } : c)),
    ]);
    setSessionsData((prev) =>
      prev.map((s) =>
        s.id === newRow.session_id
          ? { ...s, practitioner_id: newPractitionerId, consent_status: "Pending consent" }
          : s
      )
    );
    setReassigning(null);
  };

  // Global-Admin status override on a confirmation: reflect the new status and keep
  // the linked session's consent_status in sync (Consent received → Consent given;
  // Awaiting/Superseded → Pending consent, which re-opens the session for a fresh consent).
  const handleStatusOverridden = (row: ConfirmationRow, status: string) => {
    setConfirmationsData((prev) => prev.map((c) => (c.id === row.id ? { ...c, status } : c)));
    const consentStatus = status === "Consent received" ? "Consent given" : "Pending consent";
    setSessionsData((prev) =>
      prev.map((s) => (s.id === row.session_id ? { ...s, consent_status: consentStatus } : s))
    );
  };

  // Feedback lives inside a session row (rating shown inline), not its own tab —
  // so patch the matching session live when feedback is recorded/updated/removed.
  useRealtimeChannel("session_feedback", (payload) => {
    const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as {
      id?: string; session_id?: string; overall_rating?: number | null;
    };
    if (!row?.session_id) return;
    setSessionsData((prev) =>
      prev.map((s) =>
        s.id === row.session_id
          ? { ...s, session_feedback: payload.eventType === "DELETE" ? [] : [{ id: row.id as string, overall_rating: row.overall_rating ?? null }] }
          : s
      )
    );
  });

  // Derive counts from local state — updates instantly when any action fires
  const pendingPayoutList = payoutsData.filter((p) => p.status === "Pending");
  const paidPayoutList    = payoutsData.filter((p) => p.status === "Paid");
  const upcomingSessions  = sessionsData.filter((s) => s.status === "Upcoming");
  const nextSession       = upcomingSessions.sort((a, b) => a.session_date < b.session_date ? -1 : 1)[0];
  // Capture "now" once at mount (lazy initializer keeps the impure clock read out
  // of the render body) — used for the "expiring within 7 days" photo count.
  const [nowMs] = useState(() => Date.now());
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
    nextSessionDate:    nextSession?.session_date,
    confirmedSessions:  sessionsData.filter((s) => s.status === "Upcoming" && s.consent_status === "Consent given").length,
    completedSessions:  sessionsData.filter((s) => s.status === "Completed").length,
    consentPending:     sessionsData.filter((s) => s.consent_status === "Pending consent").length,
    totalRequests:      requestsData.length,
    confirmedRequests:  requestsData.filter((r) => r.status === "Confirmed").length,
    totalPractitioners: practitionersData.length,
    totalSessions:      sessionsData.length,
    totalPayouts:       payoutsData.length,
    paidPayouts:        paidPayoutList.length,
    // DB stores agreements awaiting signature as "Pending signature"; signed = "Active".
    pendingAgreements:  agreementsData.filter((a) => a.status === "Pending signature").length,
    // V4 photo model: Pending = completed session with no upload yet; Uploaded = any submission.
    // Check live photosData too so realtime uploads move a session Pending→Uploaded without reload.
    pendingPhotos:      sessionsData.filter((s) => s.status === "Completed" && !s.photos_submitted && !photosData.some((ph) => ph.session_ref === s.ref_code)).length,
    uploadedPhotos:     photosData.length,
    totalPhotos:        photosData.length + sessionsData.filter((s) => s.status === "Completed" && !s.photos_submitted && !photosData.some((ph) => ph.session_ref === s.ref_code)).length,
    urgentPhotos:       photosData.filter((p) => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - nowMs) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 7;
    }).length,
    awaitingConsent:    confirmationsData.filter((c) => c.status === "Awaiting consent").length,
    consentReceived:    confirmationsData.filter((c) => c.status === "Consent received").length,
    totalConfirmations: confirmationsData.length,
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
  // Inline manual-field edits (Pay to / Method / Invoice ref.) on a Pending row.
  const handlePayoutFieldSaved = (id: string, patch: { pay_to?: string | null; payment_method?: string | null; invoice_ref?: string }) => {
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
        { key: (p) => p.pay_to ?? p.practitioner?.upi_id ?? p.practitioner?.bank_account ?? "", label: "Pay to" },
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

  // V5 Activity "Export log" — fetches the (Global-Admin-only) audit feed fresh
  // (the rows live in ActivityLogView, not here) and downloads it as CSV.
  async function exportActivityLog() {
    const stamp = new Date().toISOString().slice(0, 10);
    const qs = new URLSearchParams({ limit: "1000", offset: "0" });
    qs.set("from", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    const res = await fetch(`/api/admin/global/activity?${qs.toString()}`);
    if (!res.ok) return;
    const j = (await res.json()) as { data?: Record<string, unknown>[] };
    downloadCsv(`activity-log-${stamp}.csv`, toCsv(j.data ?? [], [
      { key: "created_at", label: "Timestamp" },
      { key: "actor_email", label: "User" },
      { key: "actor_role", label: "Role" },
      { key: "action", label: "Action" },
      { key: "record_table", label: "Record" },
      { key: "record_id", label: "Record id" },
    ]));
  }

  function handleHeaderAction(label: string) {
    if (label.includes("Create session")) setSessionModalOpen(true);
    else if (label.includes("Add manually")) setPractitionerModalOpen(true);
    else if (label.includes("Add request")) setRequestModalOpen(true);
    else if (label.includes("Create payout")) setPayoutModalOpen(true);
    else if (label === "Trash") setTrashOpen(true);
    else if (label.includes("Credentials") || label.includes("Invite admin")) setCredentialsOpen(true);
    // Both "Export" and Photos/Activity's "Export log" export the active tab;
    // Activity has no parent-held dataset, so it fetches + exports separately.
    else if (label === "Export" || label === "Export log") {
      if (activeTab === "activity") exportActivityLog();
      else exportActiveTab();
    }
  }

  const sections = buildSections(counts, galleryVisible, isGlobalAdmin);


  return (
    // Gap 7: no global padding on main; layout wrapper
    <div style={{ display: "flex", paddingTop: 64, minHeight: "100vh", background: "#f8f7f4" }}>

      {/* ── Mobile drawer backdrop (<768px only; CSS-gated, desktop never shows it) ── */}
      {sidebarOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      {/* On desktop this stays the sticky 220px rail (inline styles, unchanged). Below
          768px, globals.css turns .admin-sidebar into an off-canvas drawer toggled by
          data-open — the mockup is a desktop spec, so the phone drawer is mockup-safe. */}
      <aside
        className="admin-sidebar"
        data-open={sidebarOpen}
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
                  onClick={() => { setActiveTab(item.tab); setSidebarOpen(false); }}
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
                  {/* V5 shows every data-tab badge, including a literal "0". */}
                  {item.badge !== undefined && (
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
            <TabHeader tab="requests" onAction={handleHeaderAction} readOnly={readOnly} />
            {/* Gap 7: table content in padded wrapper */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <RequestTable initialData={requestsData} practitioners={practitionersData} onRowChange={handleRequestRowChange} isGlobalAdmin={isGlobalAdmin} readOnly={readOnly} onHardDeleted={(id) => setRequestsData((prev) => prev.filter((r) => r.id !== id))} onEdit={isGlobalAdmin ? (id) => { const row = requestsData.find((r) => r.id === id); if (row) setEditingRequest(row); } : undefined} />
            </div>
          </div>
        )}

        {activeTab === "practitioners" && (
          <div>
            <TabHeader tab="practitioners" onAction={handleHeaderAction} readOnly={readOnly} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PractitionerTable initialData={practitionersData} onStatusChange={handlePractitionerStatusChange} isGlobalAdmin={isGlobalAdmin} readOnly={readOnly} onHardDeleted={(id) => setPractitionersData((prev) => prev.filter((p) => p.id !== id))} onEdit={isGlobalAdmin ? (p) => setEditingPractitioner(p) : undefined} />
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div>
            <TabHeader tab="sessions" onAction={handleHeaderAction} readOnly={readOnly} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <SessionTable initialData={sessionsData} onNavigate={(tab) => setActiveTab(tab)} isGlobalAdmin={isGlobalAdmin} readOnly={readOnly} onHardDeleted={(id) => setSessionsData((prev) => prev.filter((s) => s.id !== id))} onEdit={isGlobalAdmin ? (id) => { const row = sessionsData.find((s) => s.id === id); if (row) setEditingSession(toNewSession(row)); } : undefined} onStatusChange={(id, status) => setSessionsData((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)))} />
            </div>
          </div>
        )}

        {activeTab === "agreements" && (
          <div>
            <TabHeader tab="agreements" onAction={handleHeaderAction} readOnly={readOnly} />
            {/* AgreementTable owns its own Filter bar. Its only non-SA control is
                Download (kept); Edit/Delete are SA-gated, so a read-only user sees
                just the download button. */}
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <AgreementTable initialData={agreementsData} isGlobalAdmin={isGlobalAdmin} onHardDeleted={(id) => setAgreementsData((prev) => prev.filter((a) => a.id !== id))} onEdit={isGlobalAdmin ? (id) => { const row = agreementsData.find((a) => a.id === id); if (row) setEditingAgreement(row); } : undefined} />
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div>
            <TabHeader
              tab="payouts"
              onAction={handleHeaderAction}
              readOnly={readOnly}
              // V5-MATCH: Payouts header is Export-only in the mockup. "+ Create payout"
              // is a re-enablable improvement. (was: extraActions={isGlobalAdmin ? [{ label: "+ Create payout", ... }] : []})
              extraActions={[]}
            />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PayoutTable initialData={payoutsData} onRowChange={handlePayoutRowChange} onFieldSaved={handlePayoutFieldSaved} isGlobalAdmin={isGlobalAdmin} readOnly={readOnly} onEdit={isGlobalAdmin ? (id) => { const row = payoutsData.find((p) => p.id === id); if (row) setEditingPayout(row); } : undefined} />
            </div>
          </div>
        )}

        {activeTab === "consent" && (
          <div>
            <TabHeader tab="consent" onAction={handleHeaderAction} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              {/* V5 order: filter bar (PendingBar) → generate card → confirmations
                  table. The generate card is passed as ConsentTable's beforeTable so
                  the filters render above it. */}
              <ConsentTable
                initialData={confirmationsData}
                onRowChange={handleConfirmationRowChange}
                isGlobalAdmin={isGlobalAdmin}
                readOnly={readOnly}
                reassignableSessionIds={upcomingSessions.map((s) => s.id)}
                onReassign={isGlobalAdmin ? (row) => setReassigning(row) : undefined}
                onStatusOverridden={isGlobalAdmin ? handleStatusOverridden : undefined}
                beforeTable={!readOnly && (
                  <ConsentFormModal
                    inline
                    isGlobalAdmin={isGlobalAdmin}
                    confirmedSessionIds={confirmedSessionIds}
                    onCreated={(c) => { setConfirmationsData((prev) => [c, ...prev]); }}
                  />
                )}
              />
            </div>
          </div>
        )}

        {activeTab === "photos" && (
          <div>
            <TabHeader tab="photos" onAction={handleHeaderAction} readOnly={readOnly} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <PhotosTable
                initialData={photosData}
                pendingSessions={sessionsData
                  // exclude sessions that already have a submission — checking live
                  // photosData too (not just the server photos_submitted flag) so a
                  // realtime upload drops the Pending row without a reload
                  .filter((s) => s.status === "Completed" && !s.photos_submitted && !photosData.some((ph) => ph.session_ref === s.ref_code))
                  .map((s) => ({
                    id: s.id,
                    session_ref: s.ref_code ?? "—",
                    practitioner_name: s.practitioner?.name ?? "—",
                    module: s.module,
                    venue: s.venue,
                    session_date: s.session_date,
                  }))}
                isGlobalAdmin={isGlobalAdmin}
                readOnly={readOnly}
                canGallery={galleryVisible && !readOnly}
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

        {activeTab === "gallery" && galleryVisible && (
          <div>
            <TabHeader tab="gallery" onAction={handleHeaderAction} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <GalleryManager readOnly={readOnly} />
            </div>
          </div>
        )}

        {activeTab === "activity" && isGlobalAdmin && (
          <div>
            <TabHeader tab="activity" onAction={handleHeaderAction} />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              <ActivityLogView />
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <TabHeader
              tab="settings"
              onAction={handleHeaderAction}
              // V5-MATCH: the Settings header has no action buttons in the mockup.
              // Invite/Trash/Credentials are re-enablable global-admin improvements.
              extraActions={[]}
            />
            <div style={{ padding: "1.5rem 1.75rem" }}>
              {/* Practitioner Master Data — offline-contact quick reference (V4) */}
              <MasterDataTable
                practitioners={practitionersData.map((p) => ({
                  id: p.id, name: p.name, phone: p.phone, email: p.email, city: p.city, state: p.state,
                  communication_address: p.communication_address, tshirt_size: p.tshirt_size,
                }))}
              />
              {/* Team & Access (V4) — inline management via the admins modal */}
              {isGlobalAdmin && (
                <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Team &amp; Access</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 3, maxWidth: 460, lineHeight: 1.6 }}>
                        Everyone with console access. Invite new admins, set passwords, promote to global
                        admin, and grant gallery access — every action is recorded in the Activity log.
                      </div>
                    </div>
                    <button
                      onClick={() => setCredentialsOpen(true)}
                      style={{ ...primaryBtnStyle, flexShrink: 0 }}
                      aria-label="Open team and access management"
                    >
                      Manage team
                    </button>
                  </div>
                  <TeamAccessTable reloadKey={teamReloadKey} currentEmail={email} />
                  {/* V5: inline "Invite a new team member" (email + role + Send invite). */}
                  <InviteTeamMember />
                </div>
              )}

              {/* Roles & Permissions (V5) — reference table, visible to every role. */}
              <RolesPermissions />
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
      {reassigning && (
        <ReassignConsentModal
          key={reassigning.id}
          open
          onClose={() => setReassigning(null)}
          confirmation={reassigning}
          practitioners={practitionersData.map((p) => ({ id: p.id, name: p.name, email: p.email, status: p.status }))}
          onReassigned={handleReassigned}
        />
      )}
      <RequestFormModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onCreated={(r) => { setRequestsData((prev) => [r, ...prev]); }}
      />
      {credentialsOpen && (
        <CredentialsModal
          open
          onClose={() => { setCredentialsOpen(false); setTeamReloadKey((k) => k + 1); }}
          currentEmail={email}
        />
      )}
      {trashOpen && <TrashModal open onClose={() => setTrashOpen(false)} />}

      {/* Global-admin edit modals — mounted only while a record is being edited */}
      {editingPractitioner && (
        <PractitionerFormModal
          key={editingPractitioner.id}
          open
          onClose={() => setEditingPractitioner(null)}
          initialData={editingPractitioner}
          onCreated={() => {}}
          onUpdated={(p) => setPractitionersData((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
        />
      )}
      {editingSession && (
        <SessionFormModal
          key={editingSession.id}
          open
          onClose={() => setEditingSession(null)}
          practitioners={practitionersData.map((p) => ({ id: p.id, name: p.name, email: p.email, status: p.status }))}
          initialData={editingSession}
          onCreated={() => {}}
          onUpdated={(s) =>
            setSessionsData((prev) =>
              prev.map((x) =>
                x.id === s.id
                  ? {
                      ...x,
                      ref_code: s.ref_code, module: s.module, practitioner_id: s.practitioner_id,
                      session_date: s.session_date, start_time: s.start_time, end_time: s.end_time,
                      venue: s.venue, audience_type: s.audience_type, participants: s.participants,
                      payout_amount: s.payout_amount, tds_applicable: s.tds_applicable, tds_rate: s.tds_rate,
                      consent_status: s.consent_status, status: s.status, updated_at: s.updated_at,
                      practitioner: s.practitioner,
                    }
                  : x
              )
            )
          }
        />
      )}
      {editingRequest && (
        <RequestFormModal
          key={editingRequest.id}
          open
          onClose={() => setEditingRequest(null)}
          initialData={editingRequest}
          onCreated={() => {}}
          onUpdated={(r) => setRequestsData((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
        />
      )}
      {editingPayout && (
        <PayoutEditModal
          key={editingPayout.id}
          open
          onClose={() => setEditingPayout(null)}
          initialData={editingPayout}
          onSaved={(p) => setPayoutsData((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
        />
      )}
      {editingAgreement && (
        <AgreementEditModal
          key={editingAgreement.id}
          open
          onClose={() => setEditingAgreement(null)}
          initialData={editingAgreement}
          onSaved={(a) => setAgreementsData((prev) => prev.map((x) => (x.id === a.id ? a : x)))}
        />
      )}
    </div>
  );
}
