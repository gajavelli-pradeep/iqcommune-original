"use client";

import { useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { FeedbackModal } from "@/components/admin/FeedbackModal";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { useSendWithUndo } from "@/components/admin/useSendWithUndo";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";

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
  requestor?: { name: string; email: string; org?: string | null } | null;
  net_payout?: number | null;
  payout_id?: string | null;
  session_feedback?: Array<{ id: string; overall_rating: number | null }> | null;
  photos_submitted?: boolean;
}

interface FeedbackState {
  id: string;
  overall_rating: number | null;
}


const STATUS_FILTERS = ["All", "Upcoming", "Completed", "Cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

// Operator-settable delivery states. V6 Session Details limits the inline select to
// the two forward states (labelled Confirmed/Completed); Cancelled removed per V6.
const SESSION_STATUSES = ["Upcoming", "Completed"] as const;

// V6 Session Details columns (Requestor / Gross / Net / Status / Seek Feedback /
// Practitioner Rating). Photo-link sending lives on Session Consent (Part 3) and
// the Photos tab, so Session Details carries no photo/actions column.
const HEADERS = [
  "Session", // module (bold) + ref (sub) in one column
  "Requestor (SPOC)",
  "Practitioner",
  "Date",
  "Audience",
  "Participants",
  "Gross Payout (₹)",
  "Net Payout (₹)",
  { label: "Status", width: 140 },
  "Seek Feedback",
  "Practitioner Rating",
];

export function SessionTable({
  initialData,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  isGlobalAdmin = false,
  readOnly = false,
  onStatusChange,
}: {
  initialData: Session[];
  // Retained for call-site compatibility; V6 Session Details has no cross-nav /
  // edit / delete row actions, so these are accepted but unused.
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

  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [emailBusyId, setEmailBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sendUndo = useSendWithUndo();
  const [ratingDraft, setRatingDraft] = useState<{ sessionId: string; to: string; name: string; subject: string; body: string } | null>(null);

  // V6 §3 "Seek Feedback → Send email": open the editable preview (GET mints the
  // link + prefills the draft); the actual send happens on "Click to send" with a
  // 15s undo window.
  async function openRatingPreview(sessionId: string) {
    if (emailBusyId) return;
    setEmailBusyId(sessionId);
    setToast("Preparing…");
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/rating-request`);
      const j = (await res.json().catch(() => ({}))) as { to?: string; name?: string; subject?: string; body?: string; error?: string };
      if (!res.ok) {
        setToast(j.error ?? "Couldn't prepare the email");
        setTimeout(() => setToast((t) => (t ? null : t)), 4000);
        return;
      }
      setToast(null);
      setRatingDraft({ sessionId, to: j.to ?? "", name: j.name ?? "", subject: j.subject ?? "", body: j.body ?? "" });
    } finally {
      setEmailBusyId(null);
    }
  }

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

  const df = useDateFilter(data.map((s) => s.session_date));
  const visible = data.filter((s) => {
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesStatus && df.matchesDate(s.session_date);
  });
  const pendingCount = data.filter((s) => s.status === "Upcoming" && df.matchesDate(s.session_date)).length;

  // V6 columns are fixed; the read-only User tier simply sees a non-interactive
  // Seek Feedback cell ("—") and read-only rating stars.
  const headers = HEADERS;

  return (
    <div>
      <PendingBar
        pendingCards={[{
          count: pendingCount,
          label: "Confirmed, not yet Completed",
          active: statusFilter === "Upcoming",
          onToggle: () => setStatusFilter(statusFilter === "Upcoming" ? "All" : "Upcoming"),
        }]}
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
          return (
              <tr
                key={s.id}
                style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}
              >
                <td style={TD}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.module}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap", marginTop: 2 }}>
                    {s.ref_code}
                  </div>
                </td>
                {/* Requestor (SPOC) — name + organisation subline (V6) */}
                <td style={{ ...TD, fontSize: 12, color: "var(--ink-muted)" }}>
                  {s.requestor?.name ?? "—"}
                  {s.requestor?.org && (
                    <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{s.requestor.org}</div>
                  )}
                </td>
                {/* Practitioner — initials avatar chip + name (V6, no email) */}
                <td style={TD}>
                  {s.practitioner ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 600,
                          background: "var(--gold-light)",
                          color: "var(--gold-dark)",
                        }}
                      >
                        {s.practitioner.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ink)" }}>{s.practitioner.name}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500 }}>—</span>
                  )}
                </td>
                <td style={{ ...TD, fontSize: 13, color: "var(--ink)" }}>
                  {s.session_date
                    ? new Date(s.session_date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
                <td style={{ ...TD, fontSize: 12 }}>{s.audience_type ?? "—"}</td>
                <td style={{ ...TD, textAlign: "center" }}>{s.participants}</td>
                {/* Gross Payout (₹) — session gross (V6: no TDS subline) */}
                <td style={{ ...TD, fontWeight: 500 }}>
                  {formatInr(s.payout_amount)}
                </td>
                {/* Net Payout (₹) — from the Session Consent record (single source, V6 §21) */}
                <td style={{ ...TD, fontWeight: 500 }}>
                  {s.net_payout != null
                    ? formatInr(s.net_payout)
                    : <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>—</span>}
                </td>
                <td style={TD}>
                  {readOnly ? (
                    <StatusPill status={s.status} />
                  ) : (
                    <select
                      value={s.status}
                      disabled={statusBusyId === s.id}
                      aria-label={`Set status for session ${s.ref_code}`}
                      onChange={(e) => handleStatusChange(s, e.target.value)}
                      style={statusSelectStyle}
                    >
                      {SESSION_STATUSES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "Upcoming" ? "Confirmed" : opt}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                {/* Seek Feedback — V6: "Send email" rating request to the requestor (Completed only) */}
                <td style={TD} onClick={(e) => e.stopPropagation()}>
                  {!readOnly && s.status === "Completed" ? (
                    <button
                      type="button"
                      onClick={() => void openRatingPreview(s.id)}
                      disabled={emailBusyId === s.id}
                      style={{ ...sendEmailBtn, opacity: emailBusyId === s.id ? 0.6 : 1 }}
                    >
                      <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      {emailBusyId === s.id ? "Preparing…" : "Send email"}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
                  )}
                </td>
                {/* Practitioner Rating — read-only stars; manual "Got it verbally?" fallback (GA only) */}
                <td style={TD} onClick={(e) => e.stopPropagation()}>
                  <RatingCell
                    rating={feedbackBySession[s.id]?.overall_rating ?? null}
                    completed={s.status === "Completed"}
                    canRecord={isGlobalAdmin && !readOnly && s.status === "Completed"}
                    onRecord={() =>
                      setFeedbackModal({
                        sessionId: s.id,
                        sessionRef: s.ref_code,
                        practitionerName: s.practitioner?.name ?? "—",
                        existing: feedbackBySession[s.id] ?? null,
                      })
                    }
                  />
                </td>
              </tr>
          );
        })}
      </AdminTable>

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

      {ratingDraft && (
        <ContactDraftModal
          open
          editable
          sendLabel="Click to send"
          onClose={() => setRatingDraft(null)}
          recipientName={ratingDraft.name}
          recipientEmail={ratingDraft.to}
          subject={ratingDraft.subject}
          emailBody={ratingDraft.body}
          title="Send rating request"
          subtitle="Review or edit, then send — you'll get 15s to undo"
          onSend={(edited) => {
            const d = ratingDraft;
            sendUndo.send("delayed", `Rating request to ${d.to}`, async () => {
              const res = await fetch(`/api/admin/sessions/${d.sessionId}/rating-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: edited.subject, body: edited.emailBody }),
              });
              const j = (await res.json().catch(() => ({}))) as { sentTo?: string; error?: string };
              setToast(res.ok ? `Rating request sent to ${j.sentTo}` : (j.error ?? "Send failed"));
              setTimeout(() => setToast((t) => (t ? null : t)), 4000);
            });
          }}
        />
      )}
      {sendUndo.node}

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "calc(100vw - 2rem)",
            boxSizing: "border-box",
            background: "var(--ink)",
            color: "var(--surface)",
            fontSize: 13,
            fontWeight: 500,
            padding: "10px 16px",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(15,17,23,.20)",
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

const sendEmailBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "#fff",
  border: "1px solid rgba(15,17,23,0.18)",
  borderRadius: 100,
  padding: "5px 11px",
  fontSize: 11.5,
  fontWeight: 500,
  color: "var(--ink-soft)",
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 30,
};

// V6 Session Details: plain rectangular status select (mockup .status-sel) — not
// the colored pill StatusSelect. Native OS arrow kept intentionally.
const statusSelectStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 118,
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border-input)",
  fontFamily: "inherit",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--surface-soft)",
  outline: "none",
  cursor: "pointer",
};

// V6 §9: the Practitioner Rating is read-only. It's filled by the /rate closed
// loop; the manual "Got it verbally?" disclosure (GA only) is the fallback and
// disappears the moment a rating exists.
function RatingCell({
  rating,
  completed,
  canRecord,
  onRecord,
}: {
  rating: number | null;
  completed: boolean;
  canRecord: boolean;
  onRecord: () => void;
}) {
  // V6: only Completed sessions show the (empty) rating stars; others render a dash.
  if (rating == null && !completed) {
    return <span style={{ color: "var(--ink-faint)" }}>—</span>;
  }
  if (rating != null) {
    const filled = Math.round(rating);
    return (
      <span aria-label={`Rated ${rating.toFixed(1)} out of 5`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden style={{ fontSize: 14, letterSpacing: 1, color: "var(--gold)" }}>
          {"★".repeat(filled)}
          <span style={{ color: "rgba(15,17,23,0.18)" }}>{"★".repeat(5 - filled)}</span>
        </span>
      </span>
    );
  }
  // Unrated: show the empty read-only stars (V6 mockup), with the manual
  // "Got it verbally?" fallback beneath for Global Admin.
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <span aria-label="Not yet rated" style={{ fontSize: 14, letterSpacing: 1, color: "rgba(15,17,23,0.18)" }}>★★★★★</span>
      {canRecord && (
        <details>
          <summary style={{ fontSize: 11, color: "var(--ink-muted)", cursor: "pointer" }}>Got it verbally?</summary>
          <button
            type="button"
            onClick={onRecord}
            style={{ marginTop: 6, fontSize: 11, color: "var(--gold-dark)", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
          >
            Record manually
          </button>
        </details>
      )}
    </div>
  );
}


