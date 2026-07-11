"use client";

import { useState, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const REQUEST_FILTERS = ["All", "New", "Confirmed", "Cancelled"] as const;

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
}

interface DraftState {
  open: boolean;
  title?: string;
  subject?: string;
  emailBody?: string;
  waBody?: string;
  recipientName?: string;
  recipientEmail?: string;
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
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));

  const empanelled = practitioners.filter((p) => p.status === "Empanelled");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function updateStatus(id: string, status: string) {
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
  }

  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);

  // V5 P1-2: cancel a Confirmed booking. The route cascades request + linked
  // session to Cancelled and emails the client — so it needs a confirm step.
  async function cancelRequest(r: SessionRequest) {
    setCancelBusyId(r.id);
    const res = await fetch(`/api/admin/session-requests/${r.id}/cancel`, { method: "PATCH" });
    setCancelBusyId(null);
    if (res.ok) {
      setData((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "Cancelled" } : x)));
      onRowChange?.(r.id, { status: "Cancelled" });
      showToast("Session cancelled — client notified");
    } else {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      showToast(`Cancel failed: ${error ?? res.status}`);
    }
  }

  // V5: Global-Admin per-field correction on the request record. editingKey is
  // `${requestId}:${label}` so only one field across all expanded rows edits at once.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [fieldSaving, setFieldSaving] = useState(false);

  async function correctRequestField(id: string, body: Record<string, unknown>, patch: Partial<SessionRequest>) {
    setFieldSaving(true);
    const res = await fetch(`/api/admin/global/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setFieldSaving(false);
    if (res.ok) {
      setData((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      setEditingKey(null);
      showToast("Correction saved to the request record");
    } else {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      showToast(`Save failed: ${error ?? res.status}`);
    }
  }

  // V4 §4.2 one-click Assign: open a small dialog for payout + date, then create
  // the session + confirm the request via /assign. sessionRefById holds the ref
  // returned by the API for the "→ Session" read-only line.
  const [assignFor, setAssignFor] = useState<
    { requestId: string; practitionerId: string; practitionerName: string; venue: string } | null
  >(null);
  const [assignPayout, setAssignPayout] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [sessionRefById, setSessionRefById] = useState<Record<string, string>>({});

  const confirmAssign = async () => {
    if (!assignFor) return;
    const payout = Math.round(Number(assignPayout));
    if (!Number.isFinite(payout) || payout < 0) { showToast("Enter a valid payout amount"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) { showToast("Pick a session date"); return; }
    setAssignBusy(true);
    const res = await fetch(`/api/admin/session-requests/${assignFor.requestId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId: assignFor.practitionerId,
        payoutAmount: payout,
        sessionDate: assignDate,
        venue: assignFor.venue.trim() || undefined,
      }),
    });
    setAssignBusy(false);
    if (res.ok) {
      const { sessionRef } = (await res.json().catch(() => ({}))) as { sessionRef?: string };
      const { requestId, practitionerId, practitionerName } = assignFor;
      setData((prev) => prev.map((r) => r.id === requestId
        ? { ...r, status: "Confirmed", assigned_to: practitionerId, assigned_practitioner: { name: practitionerName } }
        : r));
      if (sessionRef) setSessionRefById((m) => ({ ...m, [requestId]: sessionRef }));
      onRowChange?.(requestId, { status: "Confirmed", assigned_to: practitionerId });
      showToast(`Confirmed — session ${sessionRef ?? ""} created`);
      setAssignFor(null); setAssignPayout(""); setAssignDate("");
    } else {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      showToast(`Assign failed: ${error ?? res.status}`);
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
        statusOptions={REQUEST_FILTERS}
        statusValue={filter}
        onStatusChange={setFilter}
        statusAriaLabel="Filter requests by status"
        dateFilter={df.control}
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
                  borderBottom: isExpanded ? "none" : "1px solid rgba(20,18,12,.07)",
                  cursor: "pointer",
                  background: isExpanded ? "#f8f7f4" : undefined,
                }}
              >
                {/* SPOC / Requester */}
                <td style={TD}>
                  <div style={{ fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {r.org ? `${r.org} · ` : ""}
                    {r.email}
                  </div>
                  {r.phone && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.phone}</div>
                  )}
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
                {/* Group size */}
                <td style={{ ...TD, textAlign: "center" }}>{r.group_size ?? "—"}</td>
                {/* Min. commitment */}
                <td style={{ ...TD, fontWeight: 500, whiteSpace: "nowrap" }}>
                  {r.min_commit != null ? (
                    <>
                      {r.min_commit}
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}>
                        guaranteed
                      </div>
                    </>
                  ) : (
                    "—"
                  )}
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
                    <span style={{ color: "var(--ink-muted)" }}>{r.assigned_practitioner.name}</span>
                  )}
                </td>
              </tr>

              {isExpanded && (
                <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                  <td colSpan={10} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                    <div
                      style={{
                        border: "1px solid rgba(20,18,12,.10)",
                        borderRadius: 8,
                        background: "#fff",
                        padding: "1rem 1.25rem",
                        borderTop: "2px solid #c9982a",
                      }}
                    >
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
                              { label: "Group size", value: r.group_size ?? "—", edit: { seed: r.group_size ?? "", body: (v) => ({ group_size: v || null }), patch: (v) => ({ group_size: v || null }) } },
                              { label: "Min. commitment", value: r.min_commit != null ? `${r.min_commit} participants` : "—", edit: { seed: r.min_commit != null ? String(r.min_commit) : "", type: "number", body: (v) => ({ min_commit: v ? Number(v) : null }), patch: (v) => ({ min_commit: v ? Number(v) : null }) } },
                              { label: "Venue", value: r.venue || "Not specified — we will arrange", edit: { seed: r.venue ?? "", body: (v) => ({ venue: v || null }), patch: (v) => ({ venue: v || null }) } },
                              { label: "Preferred dates", value: r.preferred_dates ?? "—" },
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
                                      <input type={edit.type ?? "text"} value={fieldDraft} autoFocus onChange={(e) => setFieldDraft(e.target.value)} style={{ padding: "4px 7px", fontSize: 12, border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, fontFamily: "inherit", background: "var(--input-paper)", outline: "none", minWidth: 120 }} />
                                      <button type="button" disabled={fieldSaving} onClick={() => correctRequestField(r.id, edit.body(fieldDraft), edit.patch(fieldDraft))} style={{ background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: fieldSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{fieldSaving ? "…" : "Save"}</button>
                                      <button type="button" onClick={() => setEditingKey(null)} style={{ background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, padding: "4px 7px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-soft)" }}>✕</button>
                                    </span>
                                  ) : (
                                    <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{value}</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Col 2: Available practitioners (read-only once Confirmed — V4) */}
                        <div>
                          <SectionLabel>{r.status === "Confirmed" ? "Assignment" : "Available practitioners"}</SectionLabel>
                          {r.status === "Confirmed" ? (
                            <div style={{ fontSize: 13, color: "#2a6b2a", fontWeight: 500, padding: "0.5rem 0" }}>
                              ✓ Assigned to {r.assigned_practitioner?.name ?? "—"}
                              <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400, marginTop: 3 }}>
                                → Session {sessionRefById[r.id] ?? "created"} · this request is read-only
                              </div>
                            </div>
                          ) : (() => {
                            const matching = empanelled.filter((p) =>
                              (p.modules ?? []).some((m) => m === r.topic)
                            );
                            if (matching.length === 0)
                              return (
                                <div style={{ fontSize: 12, color: "var(--ink-faint)", padding: "0.5rem 0" }}>
                                  No empanelled practitioners match this module yet.
                                </div>
                              );
                            return matching.map((p) => (
                              <div
                                key={p.id}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid rgba(20,18,12,.07)" }}
                              >
                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{p.name}</span>
                                {!readOnly && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignFor({ requestId: r.id, practitionerId: p.id, practitionerName: p.name, venue: r.venue ?? "" });
                                    setAssignPayout(""); setAssignDate("");
                                  }}
                                  style={{ background: "#c9982a", color: "#14161d", border: "none", borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                >
                                  Assign
                                </button>
                                )}
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Col 3: Actions — hidden for the read-only tier */}
                        {!readOnly && (
                        <div>
                          <SectionLabel>Actions</SectionLabel>
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
                          >
                            {/* V4: Confirmed is reached only via Assign and is read-only.
                                Otherwise the request can be left New or Cancelled. */}
                            {r.status === "Confirmed" ? (
                              <>
                                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, background: "var(--green-light)", color: "var(--green)", textAlign: "center" }}>
                                  Confirmed — read-only
                                </span>
                                {/* V5 P1-2: cancel cascades request + session to Cancelled and notifies the client */}
                                <button
                                  disabled={cancelBusyId === r.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({
                                      open: true,
                                      title: `Cancel session for ${r.name}?`,
                                      description: "This cancels the confirmed request and its linked session, and emails the client to let them know. The session drops out of the consent, photos and payout pipeline.",
                                      onConfirm: () => { closeConfirm(); cancelRequest(r); },
                                    });
                                  }}
                                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--red-border)", background: "#fff", color: "var(--red)", cursor: cancelBusyId === r.id ? "not-allowed" : "pointer", opacity: cancelBusyId === r.id ? 0.6 : 1, fontFamily: "inherit", fontSize: 13 }}
                                  title={`Cancel session for ${r.name}`}
                                >
                                  <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                                  {cancelBusyId === r.id ? "Cancelling…" : "Cancel session"}
                                </button>
                              </>
                            ) : (
                              <select
                                value={r.status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateStatus(r.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: "100%",
                                  padding: "9px 12px",
                                  borderRadius: 8,
                                  border: "1px solid rgba(20,18,12,.18)",
                                  fontFamily: "inherit",
                                  fontSize: 13,
                                  color: "var(--ink)",
                                  background: "#f8f7f4",
                                  outline: "none",
                                  cursor: "pointer",
                                }}
                              >
                                {["New", "Cancelled"].map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDraft(r);
                              }}
                              style={{
                                background: "var(--ink)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "10px 14px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Draft follow-up to client
                            </button>
                            {isGlobalAdmin && onEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onEdit(r.id); }}
                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
                                title={`Edit request from ${r.name}`}
                              >
                                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Edit request
                              </button>
                            )}
                            {/* V5 P2-3: hard-delete is only offered while New. Once Confirmed, the
                                exit is Cancel (above); Cancelled requests are terminal. */}
                            {isGlobalAdmin && r.status === "New" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDialog({
                                    open: true,
                                    title: `Delete request from ${r.name}`,
                                    description: "This removes the request from all lists. It stays recoverable for 30 days, then is permanently purged.",
                                    onConfirm: async () => {
                                      closeConfirm();
                                      const res = await fetch(`/api/admin/global/requests/${r.id}`, { method: "DELETE" });
                                      if (res.ok) {
                                        setData((prev) => prev.filter((x) => x.id !== r.id));
                                        onHardDeleted?.(r.id);
                                      } else {
                                        setDeleteFailedId(r.id);
                                        setTimeout(() => setDeleteFailedId((c) => (c === r.id ? null : c)), 3000);
                                      }
                                    },
                                  });
                                }}
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

      <ContactDraftModal
        open={draft.open}
        onClose={() => setDraft({ open: false })}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
        recipientName={draft.recipientName}
        recipientEmail={draft.recipientEmail}
      />
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Assign dialog (V4 §4.2): payout + session date → creates the session, confirms the request */}
      {assignFor && (
        <div
          onClick={() => !assignBusy && setAssignFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 420, padding: "1.5rem" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Assign {assignFor.practitionerName}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 4, marginBottom: "1.1rem", lineHeight: 1.5 }}>
              Creates the session and confirms this request. Start time &amp; duration are set later in Session Consent.
            </div>
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Agreed payout (₹)</label>
            <input
              type="number" min={0} value={assignPayout} onChange={(e) => setAssignPayout(e.target.value)}
              placeholder="e.g. 8000" autoFocus
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", fontFamily: "inherit", fontSize: 13, marginBottom: "0.9rem", background: "var(--input-paper)", outline: "none" }}
            />
            <label style={{ display: "block", fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>Session date</label>
            <input
              type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", fontFamily: "inherit", fontSize: 13, marginBottom: "1.25rem", background: "var(--input-paper)", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setAssignFor(null)} disabled={assignBusy} style={{ background: "#fff", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>Cancel</button>
              <button onClick={confirmAssign} disabled={assignBusy} style={{ background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: assignBusy ? "not-allowed" : "pointer", opacity: assignBusy ? 0.6 : 1, fontFamily: "inherit" }}>
                {assignBusy ? "Assigning…" : "Assign & confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

