"use client";

import { useState, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { FeedbackModal } from "@/components/admin/FeedbackModal";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface Session {
  id: string;
  ref_code: string;
  module: string;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  audience_type: string;
  participants: number;
  payout_amount: number;
  tds_applicable: boolean;
  tds_rate: number | null;
  consent_status: string;
  status: string;
  practitioner: { name: string; email: string } | null;
  payout_id?: string | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
  photos_submitted?: boolean;
}

interface FeedbackState {
  id: string;
  overall_rating: number | null;
}

function fmt12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_FILTERS = ["All", "Upcoming", "Completed", "Cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const HEADERS = [
  "Session", // V4: module (bold) + ref (sub) in one column
  "Practitioner",
  "Date & venue",
  "Audience",
  "Participants",
  "Payout",
  "Consent",
  "Status",
  "",
];

export function SessionTable({
  initialData,
  onNavigate,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  isGlobalAdmin = false,
  onHardDeleted,
  onEdit,
}: {
  initialData: Session[];
  onNavigate?: (tab: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  isGlobalAdmin?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const data = initialData;
  const [internalStatus, setInternalStatus] = useState<StatusFilter>("All");
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    statusFilterProp as StatusFilter
  )
    ? (statusFilterProp as StatusFilter)
    : internalStatus;
  const setStatusFilter = (f: StatusFilter) =>
    onStatusFilterChange ? onStatusFilterChange(f) : setInternalStatus(f);

  const [search, setSearch] = useState("");
  const [feedbackBySession, setFeedbackBySession] = useState<Record<string, FeedbackState>>(() => {
    const map: Record<string, FeedbackState> = {};
    for (const s of initialData) {
      const fb = s.session_feedback?.[0];
      if (fb) map[s.id] = { id: fb.id, overall_rating: fb.overall_rating };
    }
    return map;
  });
  const [feedbackModal, setFeedbackModal] = useState<{
    sessionId: string;
    sessionRef: string;
    practitionerName: string;
    existing?: FeedbackState | null;
  } | null>(null);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [copiedPhotoId, setCopiedPhotoId] = useState<string | null>(null);
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const [draft, setDraft] = useState<{
    open: boolean;
    title?: string;
    subject?: string;
    emailBody?: string;
    waBody?: string;
  }>({ open: false });

  const query = search.toLowerCase();
  const visible = data.filter((s) => {
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    const matchesSearch =
      !query ||
      s.ref_code?.toLowerCase().includes(query) ||
      s.module?.toLowerCase().includes(query) ||
      s.practitioner?.name?.toLowerCase().includes(query) ||
      s.venue?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      {/* Filter + Search bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(20,18,12,.10)",
          borderRadius: "10px 10px 0 0",
          borderBottom: "none",
          padding: ".75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: ".75rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
          Filter:
        </span>
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f;
          return (
            <div
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: "5px 14px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 500,
                border: isActive ? "1px solid var(--ink)" : "1px solid rgba(20,18,12,.18)",
                cursor: "pointer",
                background: isActive ? "var(--ink)" : "#fff",
                color: isActive ? "#fff" : "var(--ink-soft)",
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </div>
          );
        })}
        <div style={{ flex: 1, minWidth: 160 }}>
          <input
            type="search"
            placeholder="Search by ref, module, practitioner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(20,18,12,.15)",
              background: "#f8f7f4",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>
      </div>

      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={data.length === 0 ? "No sessions yet" : "No sessions match the current filter"}
        connected
      >
        {visible.map((s) => {
          const isExpanded = expandedRow === s.id;
          return (
            <Fragment key={s.id}>
              <tr
                onClick={() => setExpandedRow(isExpanded ? null : s.id)}
                style={{
                  borderBottom: isExpanded ? "none" : "1px solid rgba(20,18,12,.07)",
                  cursor: "pointer",
                  background: isExpanded ? "#f8f7f4" : undefined,
                }}
              >
                <td style={TD}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.module}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap", marginTop: 2 }}>
                    {s.ref_code}
                  </div>
                </td>
                <td style={TD}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.practitioner?.name ?? "—"}</div>
                  {s.practitioner?.email && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                      {s.practitioner.email}
                    </div>
                  )}
                </td>
                <td style={TD}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {s.session_date
                      ? new Date(s.session_date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                    {fmt12h(s.start_time)}–{fmt12h(s.end_time)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-faint)",
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <svg
                      width={10}
                      height={10}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 21C12 21 4 13.7 4 8a8 8 0 0 1 16 0c0 5.7-8 13-8 13z" />
                      <circle cx="12" cy="8" r="3" />
                    </svg>
                    {s.venue}
                  </div>
                </td>
                <td style={{ ...TD, fontSize: 12 }}>{s.audience_type ?? "—"}</td>
                <td style={{ ...TD, textAlign: "center" }}>{s.participants}</td>
                <td style={{ ...TD, fontWeight: 500 }}>
                  {formatInr(s.payout_amount)}
                  {s.tds_applicable && (
                    <div style={{ fontSize: 10, color: "#854f0b", fontWeight: 400, marginTop: 1 }}>
                      TDS {s.tds_rate ?? 0}%
                    </div>
                  )}
                </td>
                <td style={TD}>
                  <StatusPill status={s.consent_status} />
                </td>
                <td style={TD}>
                  <StatusPill status={s.status} />
                </td>
                <td style={{ ...TD, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {s.payout_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.("payouts");
                        }}
                        style={actionBtn("#c9982a", "#14161d")}
                      >
                        Payout →
                      </button>
                    )}
                    {s.status === "Upcoming" && s.consent_status === "Pending consent" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraft({
                            open: true,
                            title: `Send confirmation — ${s.ref_code}`,
                            subject: `Your iqcommune session is confirmed — ${s.session_date}`,
                            emailBody: `Dear ${s.practitioner?.name ?? "Practitioner"},\n\nYour session has been confirmed.\n\nRef: ${s.ref_code}\nModule: ${s.module}\nDate: ${s.session_date} · ${s.start_time}–${s.end_time}\nVenue: ${s.venue}\nParticipants: ${s.participants}\n\nPlease sign the consent form when you receive the link.\n\nWarm regards,\nThe iqcommune Team`,
                            waBody: `Hi ${s.practitioner?.name ?? ""}! 👋\n\nYour *${s.module}* session is confirmed.\n\n📅 *${s.session_date}* · ${s.start_time}–${s.end_time}\n📍 ${s.venue}\n\nPlease sign the consent form via the link we'll send shortly. See you there!`,
                          });
                        }}
                        style={actionBtn("#c9982a", "#14161d")}
                      >
                        Send confirmation
                      </button>
                    )}
                    {s.status === "Completed" && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch(`/api/admin/sessions/${s.id}/photo-link`);
                            if (!res.ok) return;
                            const { url } = (await res.json()) as { url: string };
                            window.open(url, "_blank", "noopener,noreferrer");
                            navigator.clipboard.writeText(url).catch(() => undefined);
                            setCopiedPhotoId(s.id);
                            setTimeout(() => setCopiedPhotoId((c) => (c === s.id ? null : c)), 2500);
                          } catch {
                            // silently ignore — user can retry
                          }
                        }}
                        style={{ ...actionBtn("#fff", "#14161d", true), display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        {copiedPhotoId === s.id ? "Link copied!" : "Photo link"}
                      </button>
                    )}
                    {s.status === "Completed" && s.photos_submitted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate?.("photos"); }}
                        style={{ ...actionBtn("var(--green-light)", "var(--green)", true), display: "inline-flex", alignItems: "center", gap: 4 }}
                        title="Photos received — open the Session Photos tab"
                      >
                        <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Photos received
                      </button>
                    )}
                    {s.status === "Completed" && (() => {
                      const fb = feedbackBySession[s.id];
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFeedbackModal({
                              sessionId:        s.id,
                              sessionRef:       s.ref_code,
                              practitionerName: s.practitioner?.name ?? "—",
                              existing:         fb ?? null,
                            });
                          }}
                          style={{ ...actionBtn("#fff", "#14161d", true), display: "inline-flex", alignItems: "center", gap: 3 }}
                        >
                          {fb ? (
                            <>
                              <svg width={11} height={11} viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
                                <path d="M5.5 0L6.9 4.1H11L7.6 6.6 8.9 10.7 5.5 8.2 2.1 10.7 3.4 6.6 0 4.1H4.1Z" />
                              </svg>
                              {fb.overall_rating !== null ? fb.overall_rating.toFixed(1) : "—"}
                            </>
                          ) : (
                            "Feedback"
                          )}
                        </button>
                      );
                    })()}
                    {isGlobalAdmin && onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(s.id); }}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, border: "1px solid rgba(20,18,12,.18)", background: "none", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
                        title={`Edit session ${s.ref_code}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                    )}
                    {isGlobalAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            open: true,
                            title: `Delete session ${s.ref_code}`,
                            description: "This removes the session from all lists. It stays recoverable for 30 days, then is permanently purged.",
                            onConfirm: async () => {
                              closeConfirm();
                              const res = await fetch(`/api/admin/global/sessions/${s.id}`, { method: "DELETE" });
                              if (res.ok) onHardDeleted?.(s.id);
                              else {
                                setDeleteFailedId(s.id);
                                setTimeout(() => setDeleteFailedId((c) => (c === s.id ? null : c)), 3000);
                              }
                            },
                          });
                        }}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, border: "1px solid #fca5a5", background: "none", color: "#991b1b", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, transition: "background .12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        title={`Delete session ${s.ref_code}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        {deleteFailedId === s.id ? "Delete failed!" : "Delete"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {isExpanded && (
                <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                  <td colSpan={9} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                    <div
                      style={{
                        border: "1px solid rgba(20,18,12,.10)",
                        borderRadius: 8,
                        background: "#fff",
                        padding: "1rem 1.25rem",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "0.65rem 2rem",
                        }}
                      >
                        <SField label="Reference" value={s.ref_code} mono />
                        <SField label="Module" value={s.module} />
                        <SField label="Status" value={s.status} />
                        <SField
                          label="Date"
                          value={`${s.session_date} · ${s.start_time}–${s.end_time}`}
                        />
                        <SField label="Venue" value={s.venue} />
                        <SField label="Audience" value={s.audience_type} />
                        <SField label="Participants" value={String(s.participants)} />
                        <SField label="Payout" value={formatInr(s.payout_amount)} />
                        {s.tds_applicable && (
                          <SField label="TDS rate" value={`${s.tds_rate ?? 0}%`} />
                        )}
                        <SField label="Consent" value={s.consent_status} />
                        <SField label="Practitioner" value={s.practitioner?.name ?? "—"} />
                        {s.practitioner?.email && (
                          <SField label="Practitioner email" value={s.practitioner.email} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </AdminTable>

      <ContactDraftModal
        open={draft.open}
        onClose={() => setDraft({ open: false })}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
      />

      {feedbackModal && (
        <FeedbackModal
          sessionId={feedbackModal.sessionId}
          sessionRef={feedbackModal.sessionRef}
          practitionerName={feedbackModal.practitionerName}
          existing={feedbackModal.existing}
          onClose={() => setFeedbackModal(null)}
          onSaved={(result) => {
            setFeedbackBySession((prev) => ({
              ...prev,
              [feedbackModal.sessionId]: { id: result.id, overall_rating: result.overall_rating },
            }));
          }}
        />
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

function SField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: 13, color: "var(--ink)", fontFamily: mono ? "monospace" : undefined }}
      >
        {value}
      </div>
    </div>
  );
}

function actionBtn(
  bg: string,
  color: string,
  bordered = false
): React.CSSProperties {
  return {
    fontSize: 11,
    padding: "3px 9px",
    borderRadius: 100,
    border: bordered ? "1px solid rgba(20,18,12,.18)" : "none",
    background: bg,
    color,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
  };
}
