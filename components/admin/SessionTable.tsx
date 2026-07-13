"use client";

import { useState, Fragment } from "react";
import { StatusPill, StatusSelect } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { FeedbackModal } from "@/components/admin/FeedbackModal";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { RowActionsInline } from "@/components/admin/RowActionsInline";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { useUndoToast } from "@/components/admin/useUndoToast";

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

// Accepts 24h "HH:MM" and formats to "H:MM AM/PM". Tolerant of legacy rows that
// already stored a display string ("3:37 AM") or blanks — never prints "NaN".
function fmt12h(t: string): string {
  if (!t) return "—";
  if (/[ap]m/i.test(t)) return t.trim(); // already a display string — pass through
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_FILTERS = ["All", "Upcoming", "Completed", "Cancelled"] as const;

// V5-MATCH: the mockup's only Session row action is "Generate photo link". Send
// confirmation, View payout, View photos, Feedback, Edit and Delete are gated off
// (re-enablable improvements) — see ADMIN-V5-SPECDIFF.md.
const SHOW_OFFSPEC_ACTIONS = false;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Operator-settable delivery states (Phase 4 step 21). Completed unlocks Photos +
// Payouts; Cancelled drops the session from the consent-eligible list.
const SESSION_STATUSES = ["Upcoming", "Completed", "Cancelled"] as const;

const HEADERS = [
  "Session", // V4: module (bold) + ref (sub) in one column
  "Practitioner",
  "Date & venue",
  "Audience",
  "Participants",
  "Payout (₹)",
  "Consent",
  "Status",
  "Actions",
];

export function SessionTable({
  initialData,
  onNavigate,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  isGlobalAdmin = false,
  readOnly = false,
  onHardDeleted,
  onEdit,
  onStatusChange,
}: {
  initialData: Session[];
  onNavigate?: (tab: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
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
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Persist a delivery-status change. Optimistic (parent updates immediately via
  // onStatusChange); revert + toast on failure so the cell never lies about the DB.
  async function handleStatusChange(s: Session, next: string) {
    const previous = s.status;
    setStatusBusyId(s.id);
    onStatusChange?.(s.id, next);
    try {
      const res = await fetch(`/api/admin/sessions/${s.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        onStatusChange?.(s.id, previous);
        setToast("Couldn't update status — please retry.");
        setTimeout(() => setToast((t) => (t ? null : t)), 3000);
      }
    } catch {
      onStatusChange?.(s.id, previous);
      setToast("Couldn't update status — please retry.");
      setTimeout(() => setToast((t) => (t ? null : t)), 3000);
    } finally {
      setStatusBusyId(null);
    }
  }
  const undo = useUndoToast();

  // V5 act-then-undo: delete (soft) then offer ~9s to Undo (restore via trash).
  async function deleteSessionWithUndo(id: string, label: string) {
    const res = await fetch(`/api/admin/global/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteFailedId(id);
      setTimeout(() => setDeleteFailedId((c) => (c === id ? null : c)), 3000);
      return;
    }
    onHardDeleted?.(id);
    undo.show(`Session ${label} deleted`, async () => {
      await fetch("/api/admin/global/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "sessions", id }),
      });
    });
  }
  const [draft, setDraft] = useState<{
    open: boolean;
    title?: string;
    subject?: string;
    emailBody?: string;
    waBody?: string;
  }>({ open: false });

  const df = useDateFilter(data.map((s) => s.session_date));
  const visible = data.filter((s) => {
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesStatus && df.matchesDate(s.session_date);
  });
  const pendingCount = data.filter((s) => s.status === "Upcoming" && df.matchesDate(s.session_date)).length;

  // The read-only User tier has no row actions — drop the Actions column entirely
  // (header + cell) rather than showing an empty column.
  const headers = readOnly ? HEADERS.filter((h) => h !== "Actions") : HEADERS;

  return (
    <div>
      <PendingBar
        pendingCards={[{
          count: pendingCount,
          label: "Not yet Completed (Upcoming)",
          active: statusFilter === "Upcoming",
          onToggle: () => setStatusFilter(statusFilter === "Upcoming" ? "All" : "Upcoming"),
        }]}
        statusOptions={STATUS_FILTERS}
        statusValue={statusFilter}
        onStatusChange={(f) => setStatusFilter(f as StatusFilter)}
        statusAriaLabel="Filter sessions by status"
        dateFilter={df.control}
        dateLabel="Session date:"
      />

      <AdminTable
        headers={headers}
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
                  {readOnly ? (
                    <StatusPill status={s.status} />
                  ) : (
                    <StatusSelect
                      value={s.status}
                      options={SESSION_STATUSES}
                      disabled={statusBusyId === s.id}
                      ariaLabel={`Set status for session ${s.ref_code}`}
                      onChange={(next) => handleStatusChange(s, next)}
                    />
                  )}
                </td>
                {!readOnly && (
                <td style={{ ...TD, textAlign: "right" }}>
                  {/* V5 3-state: pending-consent → helper text; not-Completed → —;
                      Completed + consent done → Generate photo link button below. */}
                  {s.consent_status === "Pending consent" ? (
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>Awaiting consent — see Session Consent tab</span>
                  ) : s.status !== "Completed" ? (
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
                  ) : null}
                  {/* V5: inline action button (Generate photo link) + gated off-spec actions. */}
                  <RowActionsInline
                    ariaLabel={`Actions for session ${s.ref_code}`}
                    actions={[
                      // Cross-link to this session's payout — pure navigation (no
                      // mutation), so it stays enabled in read-only too.
                      ...(s.payout_id
                        ? [{ label: "View payout", onClick: () => onNavigate?.("payouts") }]
                        : []),
                      ...(SHOW_OFFSPEC_ACTIONS && !readOnly && s.status === "Upcoming" && s.consent_status === "Pending consent"
                        ? [{
                            label: "Send confirmation",
                            onClick: () => setDraft({
                              open: true,
                              title: `Send confirmation — ${s.ref_code}`,
                              subject: `Your iqcommune session is confirmed — ${s.session_date}`,
                              emailBody: `Dear ${s.practitioner?.name ?? "Practitioner"},\n\nYour session has been confirmed.\n\nRef: ${s.ref_code}\nModule: ${s.module}\nDate: ${s.session_date} · ${s.start_time}–${s.end_time}\nVenue: ${s.venue}\nParticipants: ${s.participants}\n\nPlease sign the consent form when you receive the link.\n\nWarm regards,\nThe iqcommune Team`,
                              waBody: `Hi ${s.practitioner?.name ?? ""}! 👋\n\nYour *${s.module}* session is confirmed.\n\n📅 *${s.session_date}* · ${s.start_time}–${s.end_time}\n📍 ${s.venue}\n\nPlease sign the consent form via the link we'll send shortly. See you there!`,
                            }),
                          }]
                        : []),
                      ...(!readOnly && s.status === "Completed" && s.consent_status !== "Pending consent"
                        ? [{
                            label: "Generate photo link",
                            icon: (
                              <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            ),
                            onClick: async () => {
                              try {
                                const res = await fetch(`/api/admin/sessions/${s.id}/photo-link`);
                                if (!res.ok) return;
                                const { url } = (await res.json()) as { url: string };
                                window.open(url, "_blank", "noopener,noreferrer");
                                navigator.clipboard.writeText(url).catch(() => undefined);
                              } catch {
                                // silently ignore — user can retry
                              }
                            },
                          }]
                        : []),
                      ...(s.status === "Completed" && s.photos_submitted
                        ? [{ label: "View photos", onClick: () => onNavigate?.("photos") }]
                        : []),
                      ...(SHOW_OFFSPEC_ACTIONS && !readOnly && s.status === "Completed"
                        ? [{
                            label: (() => {
                              const fb = feedbackBySession[s.id];
                              if (!fb) return "Add feedback";
                              return `Feedback · ${fb.overall_rating !== null ? fb.overall_rating.toFixed(1) : "—"}`;
                            })(),
                            onClick: () => setFeedbackModal({
                              sessionId:        s.id,
                              sessionRef:       s.ref_code,
                              practitionerName: s.practitioner?.name ?? "—",
                              existing:         feedbackBySession[s.id] ?? null,
                            }),
                          }]
                        : []),
                      ...(SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit ? [{ label: "Edit", onClick: () => onEdit(s.id) }] : []),
                      ...(SHOW_OFFSPEC_ACTIONS && isGlobalAdmin
                        ? [{
                            label: deleteFailedId === s.id ? "Delete failed!" : "Delete",
                            danger: true,
                            onClick: () => deleteSessionWithUndo(s.id, s.ref_code ?? "session"),
                          }]
                        : []),
                    ]}
                  />
                </td>
                )}
              </tr>

              {isExpanded && (
                <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                  <td colSpan={headers.length} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
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
      {undo.node}

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "var(--surface)",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 16px",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(20,18,12,.20)",
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
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

