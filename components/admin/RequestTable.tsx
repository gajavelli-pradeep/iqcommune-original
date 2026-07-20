"use client";

import { useState, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { useSendWithUndo } from "@/components/admin/useSendWithUndo";
import { sendMessageRequest } from "@/lib/admin/send-message";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useUndoToast } from "@/components/admin/useUndoToast";

// V5-MATCH: the mockup's request actions are the status select, Assign, Draft
// follow-up and Cancel. Edit request / Delete request are gated off (re-enablable).
const SHOW_OFFSPEC_ACTIONS = false;

interface SessionRequest {
  id: string;
  name: string;
  org: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  topic: string;
  audience_type: string;
  group_size: string | null;
  min_commit: number | null;
  venue: string | null;
  preferred_dates: string | null;
  venue_notes?: string | null;
  notes?: string | null;
  status: string;
  assigned_to?: string | null;
  assigned_practitioner: { name: string } | null;
  created_at: string;
}

interface Practitioner {
  id: string;
  name: string;
  modules?: string[] | null;
  status: string;
  subsection_averages?: {
    content_avg: number | null;
    delivery_avg: number | null;
    engagement_avg: number | null;
    logistics_avg: number | null;
    rated_sessions: number | null;
  } | null;
}

// V6: "★{avg}" suffix on the practitioner-who-agreed options, from the per-section
// averages view already carried on the practitioner row.
function practitionerAvg(p: Practitioner): number | null {
  const s = p.subsection_averages;
  if (!s || (s.rated_sessions ?? 0) < 1) return null;
  const parts = [s.content_avg, s.delivery_avg, s.engagement_avg, s.logistics_avg].filter(
    (x): x is number => x != null,
  );
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}

interface DraftState {
  open: boolean;
  title?: string;
  subject?: string;
  emailBody?: string;
  waBody?: string;
  recipientName?: string;
  recipientEmail?: string;
  kind?: string; // V6 §3: classifies the send for the audit trail
}

const HEADERS = [
  "SPOC / Requester",
  "Topic",
  "Audience type",
  "City",
  "Group size",
  "Min. commitment",
  "Preferred dates",
  "Received",
  "Status",
  "Assigned to",
];

function buildFollowupEmail(r: SessionRequest): string {
  return `Dear ${r.name},

Thank you for reaching out to iqcommune.

We have received your session request for "${r.topic}" and are reviewing the details below:

• Topic: ${r.topic}
• Audience: ${r.audience_type}
• Group size: ${r.group_size ?? "TBD"}
• Preferred dates: ${r.preferred_dates ?? "flexible"}${r.venue ? `\n• Venue: ${r.venue}` : ""}${r.notes ? `\n• Notes: ${r.notes}` : ""}

Our team will match you with a suitable practitioner and confirm the session details within 2–3 working days.

Please feel free to reply to this email if you have any questions.

Warm regards,
The iqcommune Team`;
}

function buildFollowupWA(r: SessionRequest): string {
  return `Hi ${r.name}! 👋

This is the iqcommune team. We've received your session request for *${r.topic}* (${r.group_size ?? "TBD"} participants, ${r.preferred_dates ?? "flexible"}).

We're reviewing your request and will confirm the practitioner match within 2–3 working days.

Feel free to reach out if you have any questions!`;
}

export function RequestTable({
  initialData,
  practitioners = [],
  onRowChange,
  isGlobalAdmin = false,
  readOnly = false,
  onHardDeleted,
  onEdit,
}: {
  initialData: SessionRequest[];
  practitioners?: Practitioner[];
  onRowChange?: (id: string, patch: { status?: string; assigned_to?: string | null }) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState("All");
  // Reflect parent-driven updates (e.g. a global-admin edit) without an effect.
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) { setPrevInitial(initialData); setData(initialData); }
  const df = useDateFilter(data.map((r) => r.created_at));
  const visible = (filter === "All" ? data : data.filter((r) => r.status === filter))
    .filter((r) => df.matchesDate(r.created_at));
  const pendingCount = data.filter((r) => r.status === "New" && df.matchesDate(r.created_at)).length;
  const [toast, setToast] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({ open: false });
  const sendUndo = useSendWithUndo();
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);
  // confirmLabel matters: ConfirmDialog defaults to "Delete", which misdescribes a cancel.
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const undo = useUndoToast();

  // V5 act-then-undo: delete immediately (soft), offer ~9s to Undo (restore via trash).
  async function deleteRequestWithUndo(r: SessionRequest) {
    setData((prev) => prev.filter((x) => x.id !== r.id));
    onHardDeleted?.(r.id);
    const res = await fetch(`/api/admin/global/requests/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      setData((prev) => [r, ...prev]); // revert on failure
      setDeleteFailedId(r.id);
      setTimeout(() => setDeleteFailedId((c) => (c === r.id ? null : c)), 3000);
      return;
    }
    undo.show(`Request from ${r.name} deleted`, async () => {
      await fetch("/api/admin/global/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "session_requests", id: r.id }),
      });
      setData((prev) => [r, ...prev]);
    });
  }

  const empanelled = practitioners.filter((p) => p.status === "Empanelled");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/session-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setData((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
        onRowChange?.(id, { status });
        showToast("Status updated");
      } else {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        showToast(`Update failed: ${error ?? res.status}`);
      }
    } catch {
      showToast("Network error — status not updated. Please retry.");
    }
  }

  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);

  // V5 P1-2: cancel a Confirmed booking. The route cascades request + linked
  // session to Cancelled and emails the client — so it needs a confirm step.
  async function cancelRequest(r: SessionRequest) {
    setCancelBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/session-requests/${r.id}/cancel`, { method: "PATCH" });
      if (res.ok) {
        setData((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "Cancelled" } : x)));
        onRowChange?.(r.id, { status: "Cancelled" });
        showToast("Session cancelled — client notified");
      } else {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        showToast(`Cancel failed: ${error ?? res.status}`);
      }
    } catch {
      showToast("Network error — the session was not cancelled. Please retry.");
    } finally {
      // In `finally`, not after the fetch: a network throw used to skip this and
      // leave the row's Cancel button disabled until a full page reload.
      setCancelBusyId(null);
    }
  }

  // V5: Global-Admin per-field correction on the request record. editingKey is
  // `${requestId}:${label}` so only one field across all expanded rows edits at once.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [fieldSaving, setFieldSaving] = useState(false);

  async function correctRequestField(id: string, body: Record<string, unknown>, patch: Partial<SessionRequest>) {
    setFieldSaving(true);
    try {
      const res = await fetch(`/api/admin/global/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setData((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        setEditingKey(null);
        showToast("Correction saved to the request record");
      } else {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        showToast(`Save failed: ${error ?? res.status}`);
      }
    } catch {
      showToast("Network error — the correction was not saved. Please retry.");
    } finally {
      setFieldSaving(false);
    }
  }

  // V6 Assignment: per-row "practitioner who agreed" + "agreed gross payout",
  // filled after the offline call. Setting the request to Confirmed creates the
  // session from these (no date — scheduled later). sessionRefById holds the ref
  // returned by /assign for the "→ Session" line.
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});  // requestId -> practitionerId
  const [assignPay, setAssignPay] = useState<Record<string, string>>({});  // requestId -> gross payout
  const [assignDate, setAssignDate] = useState<Record<string, string>>({}); // requestId -> session date (optional)
  const [assignBusy, setAssignBusy] = useState<string | null>(null);       // requestId being confirmed
  const [sessionRefById, setSessionRefById] = useState<Record<string, string>>({});

  const assignAndConfirm = async (r: SessionRequest): Promise<boolean> => {
    const practitionerId = assignSel[r.id];
    const payoutRaw = (assignPay[r.id] ?? "").trim();
    if (!practitionerId) { showToast("Pick the practitioner who agreed first"); return false; }
    const payout = Math.round(Number(payoutRaw));
    if (payoutRaw === "" || !Number.isFinite(payout) || payout < 0) { showToast("Enter the agreed gross payout"); return false; }
    const practitionerName = empanelled.find((p) => p.id === practitionerId)?.name ?? "practitioner";
    setAssignBusy(r.id);
    try {
      const res = await fetch(`/api/admin/session-requests/${r.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practitionerId,
          payoutAmount: payout,
          // Optional: when blank the server schedules a placeholder date the admin
          // can correct later, so the real date is never unsettable.
          ...(/^\d{4}-\d{2}-\d{2}$/.test(assignDate[r.id] ?? "") ? { sessionDate: assignDate[r.id] } : {}),
          venue: r.venue?.trim() || undefined,
        }),
      });
      if (res.ok) {
        const { sessionRef } = (await res.json().catch(() => ({}))) as { sessionRef?: string };
        setData((prev) => prev.map((x) => x.id === r.id
          ? { ...x, status: "Confirmed", assigned_to: practitionerId, assigned_practitioner: { name: practitionerName } }
          : x));
        if (sessionRef) setSessionRefById((m) => ({ ...m, [r.id]: sessionRef }));
        onRowChange?.(r.id, { status: "Confirmed", assigned_to: practitionerId });
        // ~9s to reverse a fresh assignment — soft-deletes the created session,
        // resets the request to New, no client email.
        undo.show(`Confirmed — session ${sessionRef ?? ""} created`, () => unassignRequest(r, true));
        return true;
      }
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      showToast(`Assign failed: ${error ?? res.status}`);
      return false;
    } catch {
      showToast("Network error — the session was not assigned. Please retry.");
      return false;
    } finally {
      setAssignBusy(null);
    }
  };

  // Reset a Confirmed request to New (soft-deletes the created session). `quiet`
  // suppresses the toast when called from the assignment undo.
  const unassignRequest = async (r: SessionRequest, quiet = false) => {
    let rev: Response;
    try { rev = await fetch(`/api/admin/session-requests/${r.id}/unassign`, { method: "POST" }); }
    catch { showToast("Network error — could not reset to New. Cancel the session instead."); return; }
    if (!rev.ok) { showToast("Could not reset to New — cancel the session instead."); return; }
    setData((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "New", assigned_to: null, assigned_practitioner: null } : x));
    setSessionRefById((m) => { const n = { ...m }; delete n[r.id]; return n; });
    onRowChange?.(r.id, { status: "New", assigned_to: null });
    if (!quiet) showToast("Reset to New");
  };

  // Central handler for the col-3 [New, Confirmed, Cancelled] status select.
  const handleStatusChange = (r: SessionRequest, next: string) => {
    if (next === r.status) return;
    if (next === "Confirmed") { void assignAndConfirm(r); return; }
    if (next === "Cancelled") {
      if (r.status === "Confirmed") {
        setConfirmDialog({
          open: true,
          title: `Cancel session for ${r.name}?`,
          description: "This cancels the confirmed request and its linked session, and emails the client to let them know. The session drops out of the consent, photos and payout pipeline.",
          confirmLabel: "Cancel session",
          onConfirm: () => { closeConfirm(); cancelRequest(r); },
        });
      } else { void updateStatus(r.id, "Cancelled"); }
      return;
    }
    if (next === "New") {
      if (r.status === "Confirmed") { void unassignRequest(r); }
      else { void updateStatus(r.id, "New"); }
    }
  };

  function openDraft(r: SessionRequest) {
    setDraft({
      open: true,
      title: `Follow-up: ${r.name}`,
      subject: `Your iqcommune session request — ${r.topic}`,
      emailBody: buildFollowupEmail(r),
      waBody: buildFollowupWA(r),
      recipientName: r.name,
      recipientEmail: r.email,
      kind: "followup-client",
    });
  }

  function openCancelDraft(r: SessionRequest) {
    setDraft({
      open: true,
      title: `Cancellation: ${r.name}`,
      subject: `iqcommune — update on your session request`,
      emailBody: `Dear ${r.name},\n\nThank you for your interest in an iqcommune session on "${r.topic}".\n\nUnfortunately we're unable to take this request forward at this time. We're sorry for any inconvenience, and we'd be glad to help if your needs change or you'd like to explore another topic — simply reply to this email.\n\nWarm regards,\nThe iqcommune Team`,
      waBody: `Hi ${r.name}, this is the iqcommune team regarding your session request for *${r.topic}*. Unfortunately we're unable to take it forward at this time. Do reach out if you'd like to explore another topic.`,
      recipientName: r.name,
      recipientEmail: r.email,
      kind: "cancellation-client",
    });
  }

  return (
    <div>
      <PendingBar
        pendingCards={[{
          count: pendingCount,
          label: "New — unassigned",
          active: filter === "New",
          onToggle: () => setFilter(filter === "New" ? "All" : "New"),
        }]}
        dateFilter={df.control}
        dateLabel="Received in:"
      />
      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={
          data.length === 0 ? "No session requests yet" : "No requests match the current filter"
        }
        connected
      >
        {visible.map((r) => {
          const isExpanded = expandedRow === r.id;
          return (
            <Fragment key={r.id}>
              <tr
                onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                style={{
                  borderBottom: isExpanded ? "none" : "1px solid rgba(15,17,23,.07)",
                  cursor: "pointer",
                  background: isExpanded ? "#f8f7f4" : undefined,
                }}
              >
                {/* SPOC / Requester — V6: name + org only (email/phone live in the expand) */}
                <td style={TD}>
                  <div style={{ fontWeight: 500 }}>{r.name}</div>
                  {r.org && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.org}</div>}
                  {/* Venue-status line — pending uses gold-dark (needs-action), not red. */}
                  <div style={{ fontSize: 11, marginTop: 2, color: r.venue ? "var(--green)" : "var(--gold-dark)" }}>
                    {r.venue ? "📍 Venue provided" : "⚠ Venue pending"}
                  </div>
                </td>
                {/* Topic */}
                <td style={TD}>{r.topic}</td>
                {/* Audience type */}
                <td style={TD}>{r.audience_type}</td>
                {/* City */}
                <td style={TD}>
                  <div>{r.city ?? "—"}</div>
                  {r.state && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.state}</div>
                  )}
                </td>
                {/* Group size — V6: left-aligned "{n} people", muted */}
                <td style={{ ...TD, color: "var(--ink-muted)" }}>{r.group_size ? `${r.group_size} people` : "—"}</td>
                {/* Min. commitment — V6: "{n} pax" (gold-dark, weight 600) */}
                <td style={{ ...TD, fontWeight: 600, whiteSpace: "nowrap", color: "var(--gold-dark)" }}>
                  {r.min_commit != null ? `${r.min_commit} pax` : "—"}
                </td>
                {/* Preferred dates */}
                <td style={TD}>{r.preferred_dates ?? "—"}</td>
                {/* Received */}
                <td style={{ ...TD, fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                  {new Date(r.created_at).toLocaleDateString("en-IN")}
                </td>
                {/* Status */}
                <td style={TD}>
                  <StatusPill status={r.status} />
                </td>
                {/* Assigned to (V4: inline summary; all actions live in the expanded dropdown) */}
                <td style={{ ...TD, fontSize: 12 }}>
                  {r.status === "New" || !r.assigned_practitioner ? (
                    <span style={{ color: "var(--ink-faint)" }}>Unassigned</span>
                  ) : (
                    <div>
                      <span style={{ color: "var(--ink-muted)" }}>{r.assigned_practitioner.name}</span>
                      {sessionRefById[r.id] && (
                        <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>→ Session {sessionRefById[r.id]}</div>
                      )}
                    </div>
                  )}
                </td>
              </tr>

              {isExpanded && (
                <tr style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
                  <td colSpan={10} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                    <div
                      style={{
                        position: "relative",
                        border: "1px solid rgba(15,17,23,.10)",
                        borderRadius: 8,
                        background: "#fff",
                        padding: "1rem 1.25rem",
                        borderTop: "2px solid #c9982a",
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Close request"
                        onClick={(e) => { e.stopPropagation(); setExpandedRow(null); }}
                        style={{ position: "absolute", top: 10, right: 12, width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(15,17,23,.12)", background: "#fff", color: "var(--ink-faint)", cursor: "pointer", fontSize: 13, lineHeight: 1, fontFamily: "inherit" }}
                      >
                        ✕
                      </button>
                      <div
                        style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "2rem" }}
                      >
                        {/* Col 1: Request details */}
                        <div>
                          <SectionLabel>Request details</SectionLabel>
                          {(() => {
                            // V5: Global-Admin pencil corrects the request record in place.
                            type Row = { label: string; value: React.ReactNode; edit?: { seed: string; type?: "text" | "number"; body: (v: string) => Record<string, unknown>; patch: (v: string) => Partial<SessionRequest> } };
                            const rows: Row[] = [
                              { label: "From", value: r.name, edit: { seed: r.name, body: (v) => ({ name: v }), patch: (v) => ({ name: v }) } },
                              { label: "Organisation", value: r.org ?? "—", edit: { seed: r.org ?? "", body: (v) => ({ org: v || null }), patch: (v) => ({ org: v || null }) } },
                              { label: "Email", value: r.email },
                              { label: "City", value: r.city ?? "—", edit: { seed: r.city ?? "", body: (v) => ({ city: v || null }), patch: (v) => ({ city: v || null }) } },
                              { label: "State", value: r.state ?? "—", edit: { seed: r.state ?? "", body: (v) => ({ state: v || null }), patch: (v) => ({ state: v || null }) } },
                              { label: "Topic", value: r.topic, edit: { seed: r.topic, body: (v) => ({ topic: v }), patch: (v) => ({ topic: v }) } },
                              { label: "Audience", value: r.audience_type, edit: { seed: r.audience_type, body: (v) => ({ audience_type: v }), patch: (v) => ({ audience_type: v }) } },
                              { label: "SPOC", value: `${r.name} (primary contact)` },
                              { label: "Group size", value: r.group_size ?? "—", edit: { seed: r.group_size ?? "", body: (v) => ({ group_size: v || null }), patch: (v) => ({ group_size: v || null }) } },
                              { label: "Min. commitment", value: r.min_commit != null ? `${r.min_commit} participants` : "—", edit: { seed: r.min_commit != null ? String(r.min_commit) : "", type: "number", body: (v) => ({ min_commit: v ? Number(v) : null }), patch: (v) => ({ min_commit: v ? Number(v) : null }) } },
                              { label: "Venue", value: r.venue || "Not specified — pending from SPOC", edit: { seed: r.venue ?? "", body: (v) => ({ venue: v || null }), patch: (v) => ({ venue: v || null }) } },
                              { label: "Preferred dates", value: r.preferred_dates ?? "—" },
                              { label: "Received", value: new Date(r.created_at).toLocaleDateString("en-IN") },
                            ];
                            return rows.map(({ label, value, edit }) => {
                              const key = `${r.id}:${label}`;
                              const editing = editingKey === key;
                              return (
                                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: "0.45rem" }}>
                                  <span style={{ color: "var(--ink-faint)", width: 110, flexShrink: 0, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    {label}
                                    {isGlobalAdmin && edit && !editing && (
                                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingKey(key); setFieldDraft(edit.seed); }} title="Global Admin: correct the request record" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--gold-dark)", display: "inline-flex", lineHeight: 0 }}>
                                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                                      </button>
                                    )}
                                  </span>
                                  {isGlobalAdmin && edit && editing ? (
                                    <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                                      <input type={edit.type ?? "text"} value={fieldDraft} autoFocus onChange={(e) => setFieldDraft(e.target.value)} style={{ padding: "4px 7px", fontSize: 12, border: "1px solid rgba(15,17,23,.18)", borderRadius: 6, fontFamily: "inherit", background: "var(--input-paper)", outline: "none", minWidth: 120 }} />
                                      <button type="button" disabled={fieldSaving} onClick={() => correctRequestField(r.id, edit.body(fieldDraft), edit.patch(fieldDraft))} style={{ background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: fieldSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{fieldSaving ? "…" : "Save"}</button>
                                      <button type="button" onClick={() => setEditingKey(null)} style={{ background: "none", border: "1px solid rgba(15,17,23,.18)", borderRadius: 6, padding: "4px 7px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-soft)" }}>✕</button>
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{value}</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Col 2: Assignment — practitioner-who-agreed + agreed gross payout.
                            V6: filled after the offline call; no auto-matching, no date here. */}
                        <div>
                          <SectionLabel>Assignment</SectionLabel>
                          {r.status === "Confirmed" ? (
                            <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500, padding: "0.5rem 0" }}>
                              ✓ Assigned to {r.assigned_practitioner?.name ?? "—"}
                              <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400, marginTop: 3 }}>
                                → Session {sessionRefById[r.id] ?? "created"} · date scheduled later in Session Details
                              </div>
                            </div>
                          ) : r.status === "Cancelled" ? (
                            <div style={{ fontSize: 12, color: "var(--ink-faint)", padding: "0.5rem 0" }}>This request was cancelled.</div>
                          ) : readOnly ? (
                            <div style={{ fontSize: 12, color: "var(--ink-faint)", padding: "0.5rem 0" }}>Not yet assigned.</div>
                          ) : (
                            <div onClick={(e) => e.stopPropagation()}>
                              <div style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5, marginBottom: "0.65rem" }}>
                                Fill these in after your call with the practitioner — nothing is matched automatically.
                              </div>
                              <label style={assignLabel}>Practitioner who agreed</label>
                              <select
                                value={assignSel[r.id] ?? ""}
                                onChange={(e) => setAssignSel((m) => ({ ...m, [r.id]: e.target.value }))}
                                style={assignField}
                              >
                                <option value="">— Not yet assigned —</option>
                                {empanelled.map((p) => {
                                  const avg = practitionerAvg(p);
                                  return (
                                    <option key={p.id} value={p.id}>
                                      {p.name}{avg != null ? ` — ★${avg}` : " — not yet rated"}
                                    </option>
                                  );
                                })}
                              </select>
                              {empanelled.length === 0 && (
                                <div style={{ fontSize: 11, color: "var(--gold-dark)", marginBottom: "0.65rem" }}>No empanelled practitioners yet.</div>
                              )}
                              <label style={assignLabel}>Agreed gross payout (₹)</label>
                              <input
                                type="number" min={0} inputMode="numeric"
                                value={assignPay[r.id] ?? ""}
                                onChange={(e) => setAssignPay((m) => ({ ...m, [r.id]: e.target.value }))}
                                placeholder="e.g. 8000"
                                style={assignField}
                              />
                              <label style={assignLabel}>
                                Session date{" "}
                                <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional — can be set later)</span>
                              </label>
                              <input
                                type="date"
                                value={assignDate[r.id] ?? ""}
                                onChange={(e) => setAssignDate((m) => ({ ...m, [r.id]: e.target.value }))}
                                style={assignField}
                              />
                              <div style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                                Set the status to &quot;Matched&quot; on the right to create the session.
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Col 3: Status — V6 [New, Confirmed, Cancelled]. Confirmed creates
                            the session from the Assignment panel; New (from Confirmed) unassigns;
                            Cancelled (from Confirmed) cascades + emails the client. */}
                        {!readOnly && (
                        <div>
                          <SectionLabel>Status</SectionLabel>
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
                          >
                            <select
                              value={r.status}
                              disabled={assignBusy === r.id || cancelBusyId === r.id}
                              onChange={(e) => { e.stopPropagation(); handleStatusChange(r, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: "100%",
                                padding: "9px 12px",
                                borderRadius: 8,
                                border: "1px solid rgba(15,17,23,.18)",
                                fontFamily: "inherit",
                                fontSize: 13,
                                color: "var(--ink)",
                                background: "#f8f7f4",
                                outline: "none",
                                cursor: assignBusy === r.id || cancelBusyId === r.id ? "not-allowed" : "pointer",
                              }}
                            >
                              {/* Value stays the DB "Confirmed"; label follows the V6 pill wording ("Matched"). */}
                              {["New", "Confirmed", "Cancelled"].map((s) => (
                                <option key={s} value={s}>{s === "Confirmed" ? "Matched" : s}</option>
                              ))}
                            </select>
                            {(assignBusy === r.id || cancelBusyId === r.id) && (
                              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                                {assignBusy === r.id ? "Creating session…" : "Cancelling…"}
                              </div>
                            )}
                            <div style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                              Set to Matched once you&apos;ve filled in the practitioner and payout on the left. Set to Cancelled if the session falls through.
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); openDraft(r); }}
                              style={{
                                background: "var(--ink)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 100,
                                padding: "10px 14px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Send follow-up to client
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openCancelDraft(r); }}
                              style={{
                                background: "var(--surface)",
                                border: "1px solid var(--border-strong)",
                                color: "var(--ink-muted)",
                                borderRadius: 100,
                                padding: "9px 14px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Send cancellation message
                            </button>
                            {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onEdit(r.id); }}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
                                title={`Edit request from ${r.name}`}
                              >
                                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit request
                              </button>
                            )}
                            {/* V5 P2-3: hard-delete is only offered while New. Once Confirmed, the
                                exit is Cancel (above); Cancelled requests are terminal. */}
                            {/* V5: "Delete permanently" on New requests (mockup role-edit;
                                kept global-admin here for destructive-action safety). */}
                            {isGlobalAdmin && r.status === "New" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteRequestWithUndo(r); }}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--red-border)", background: "#fff", color: "var(--red)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
                                title={`Delete request from ${r.name}`}
                              >
                                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                                {deleteFailedId === r.id ? "Delete failed!" : "Delete request"}
                              </button>
                            )}
                          </div>
                        </div>
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

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
      {undo.node}

      <ContactDraftModal
        open={draft.open}
        editable
        sendLabel="Click to send"
        subtitle="Click into the text below to edit before sending"
        onClose={() => setDraft({ open: false })}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
        recipientName={draft.recipientName}
        recipientEmail={draft.recipientEmail}
        onSend={(edited) => {
          const to = draft.recipientEmail;
          const name = draft.recipientName;
          const kind = draft.kind;
          if (!to) { showToast("No email on file for this requester."); return; }
          // Follow-up to client is internal (Type A) — fire instantly.
          sendUndo.send("instant", `Follow-up to ${to}`, async () => {
            const r = await sendMessageRequest({ to, name, subject: edited.subject, body: edited.emailBody, kind });
            showToast(r.ok ? `Follow-up sent to ${r.sentTo}` : (r.error ?? "Send failed"));
          });
        }}
      />
      {sendUndo.node}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

    </div>
  );
}

const assignLabel: React.CSSProperties = {
  display: "block", fontSize: 12, color: "var(--ink-soft)", marginBottom: 4,
};
const assignField: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)",
  fontFamily: "inherit", fontSize: 13, marginBottom: "0.75rem", background: "var(--input-paper)",
  color: "var(--ink)", outline: "none", boxSizing: "border-box",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-faint)",
        marginBottom: "0.85rem",
      }}
    >
      {children}
    </div>
  );
}

