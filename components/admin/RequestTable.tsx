"use client";

import { useState, useCallback, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

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
  "Actions",
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
  statusFilter = "all",
  isSuperAdmin = false,
  onHardDeleted,
  onEdit,
}: {
  initialData: SessionRequest[];
  practitioners?: Practitioner[];
  onRowChange?: (id: string, patch: { status?: string; assigned_to?: string | null }) => void;
  statusFilter?: string;
  isSuperAdmin?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const [data, setData] = useState(initialData);
  // Reflect parent-driven updates (e.g. a super-admin edit) without an effect.
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) { setPrevInitial(initialData); setData(initialData); }
  const visible = statusFilter === "all" ? data : data.filter((r) => r.status === statusFilter);
  const [toast, setToast] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({ open: false });
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));

  const empanelled = practitioners.filter((p) => p.status === "Empanelled");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateStatus = useCallback(
    async (id: string, status: string) => {
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [onRowChange]
  );

  const assignPractitioner = useCallback(
    async (id: string, practitionerId: string) => {
      const res = await fetch(`/api/admin/session-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: practitionerId }),
      });
      if (res.ok) {
        const pr = empanelled.find((p) => p.id === practitionerId);
        setData((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  assigned_to: practitionerId,
                  assigned_practitioner: pr
                    ? { name: pr.name }
                    : r.assigned_practitioner,
                }
              : r
          )
        );
        onRowChange?.(id, { assigned_to: practitionerId });
        showToast("Practitioner assigned");
      } else {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        showToast(`Assignment failed: ${error ?? res.status}`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [empanelled, onRowChange]
  );

  const openDraft = useCallback((r: SessionRequest) => {
    setDraft({
      open: true,
      title: `Follow-up: ${r.name}`,
      subject: `Your iqcommune session request — ${r.topic}`,
      emailBody: buildFollowupEmail(r),
      waBody: buildFollowupWA(r),
      recipientName: r.name,
      recipientEmail: r.email,
    });
  }, []);

  return (
    <div>
      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={
          data.length === 0 ? "No session requests yet" : "No requests match the current filter"
        }
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
                {/* Actions */}
                <td style={TD} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {r.status === "New" ? (
                      <button
                        onClick={() => {
                          updateStatus(r.id, "Matched");
                          setExpandedRow(r.id);
                        }}
                        style={darkBtn}
                      >
                        Review
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={r.status}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                          style={selectStyle}
                        >
                          {["New", "Matched", "Confirmed", "Completed", "Cancelled"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => openDraft(r)} style={ghostBtn}>
                          Email draft
                        </button>
                      </div>
                    )}
                    {isSuperAdmin && onEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(r.id); }}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, border: "1px solid rgba(20,18,12,.18)", background: "none", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, alignSelf: "flex-start" }}
                        title={`Edit request from ${r.name}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            open: true,
                            title: `Delete request from ${r.name}`,
                            description: "This removes the request from all lists. It stays recoverable for 30 days, then is permanently purged.",
                            onConfirm: async () => {
                              closeConfirm();
                              const res = await fetch(`/api/admin/super/requests/${r.id}`, { method: "DELETE" });
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
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, border: "1px solid var(--red-border)", background: "none", color: "var(--red)", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, alignSelf: "flex-start", transition: "background .12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        title={`Delete request from ${r.name}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        {deleteFailedId === r.id ? "Delete failed!" : "Delete"}
                      </button>
                    )}
                  </div>
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
                          {[
                            ["From", r.name],
                            ["Organisation", r.org ?? "—"],
                            ["Email", r.email],
                            ["City", r.city ?? "—"],
                            ["State", r.state ?? "—"],
                            ["Topic", r.topic],
                            ["Audience", r.audience_type],
                            ["Group size", r.group_size ?? "—"],
                            [
                              "Min. commitment",
                              r.min_commit != null ? `${r.min_commit} participants` : "—",
                            ],
                            ["Venue", r.venue || "Not specified — we will arrange"],
                            ["Preferred dates", r.preferred_dates ?? "—"],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: "0.45rem",
                              }}
                            >
                              <span
                                style={{
                                  color: "var(--ink-faint)",
                                  width: 110,
                                  flexShrink: 0,
                                  fontSize: 12,
                                }}
                              >
                                {label}
                              </span>
                              <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Col 2: Available practitioners */}
                        <div>
                          <SectionLabel>Available practitioners</SectionLabel>
                          {(() => {
                            const matching = empanelled.filter((p) =>
                              (p.modules ?? []).some((m) => m === r.topic)
                            );
                            if (matching.length === 0)
                              return (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--ink-faint)",
                                    padding: "0.5rem 0",
                                  }}
                                >
                                  No empanelled practitioners match this module yet.
                                </div>
                              );
                            return matching.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "0.45rem 0",
                                  borderBottom: "1px solid rgba(20,18,12,.07)",
                                }}
                              >
                                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                                  {p.name}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assignPractitioner(r.id, p.id);
                                  }}
                                  style={{
                                    background: "#c9982a",
                                    color: "#14161d",
                                    border: "none",
                                    borderRadius: 100,
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Assign
                                </button>
                              </div>
                            ));
                          })()}
                          {r.assigned_practitioner && (
                            <div
                              style={{ marginTop: "0.75rem", fontSize: 12, color: "#2a6b2a", fontWeight: 500 }}
                            >
                              ✓ Assigned: {r.assigned_practitioner.name}
                            </div>
                          )}
                        </div>

                        {/* Col 3: Actions */}
                        <div>
                          <SectionLabel>Actions</SectionLabel>
                          <div
                            style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
                          >
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
                              {["New", "Matched", "Confirmed", "Completed", "Cancelled"].map(
                                (s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                )
                              )}
                            </select>
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
                          </div>
                        </div>
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

const CHEVRON_GOLD =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 22px 5px 8px",
  borderRadius: 6,
  border: "1px solid rgba(20,18,12,.18)",
  background: `${CHEVRON_GOLD} no-repeat right 7px center, #fcfbf8`,
  appearance: "none",
  WebkitAppearance: "none",
  color: "#14161d",
  cursor: "pointer",
  fontFamily: "inherit",
};

const darkBtn: React.CSSProperties = {
  background: "var(--ink)",
  color: "#fff",
  border: "none",
  borderRadius: 100,
  padding: "4px 10px",
  fontSize: 11,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 500,
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(20,18,12,.07)",
  border: "none",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
