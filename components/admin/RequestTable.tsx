"use client";

import { useState, useCallback, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";

interface SessionRequest {
  id: string;
  name: string;
  org: string;
  email: string;
  phone: string | null;
  topic: string;
  audience_type: string;
  group_size: string;
  min_commit: number;
  venue: string | null;
  preferred_dates: string;
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

function buildRequestFollowupEmail(r: SessionRequest): string {
  return `Dear ${r.name},

Thank you for reaching out to iqcommune.

We have received your session request for "${r.topic}" and are reviewing the details below:

• Topic: ${r.topic}
• Audience: ${r.audience_type}
• Group size: ${r.group_size}
• Preferred dates: ${r.preferred_dates}${r.venue ? `\n• Venue: ${r.venue}` : ""}${r.notes ? `\n• Notes: ${r.notes}` : ""}

Our team will match you with a suitable practitioner and confirm the session details within 2–3 working days.

Please feel free to reply to this email if you have any questions.

Warm regards,
The iqcommune Team`;
}

function buildRequestFollowupWA(r: SessionRequest): string {
  return `Hi ${r.name}! 👋

This is the iqcommune team. We've received your session request for *${r.topic}* (${r.group_size} participants, ${r.preferred_dates}).

We're reviewing your request and will confirm the practitioner match within 2–3 working days.

Feel free to reach out if you have any questions!`;
}

export function RequestTable({
  initialData,
  practitioners = [],
  onRowChange,
  statusFilter = "all",
}: {
  initialData: SessionRequest[];
  practitioners?: Practitioner[];
  onRowChange?: (id: string, patch: { status?: string; assigned_to?: string | null }) => void;
  statusFilter?: string;
}) {
  const [data, setData] = useState(initialData);
  const visible = statusFilter === "all" ? data : data.filter((r) => r.status === statusFilter);
  const [toast, setToast] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({ open: false });

  const empanelled = practitioners.filter((p) => p.status === "Empanelled");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateStatus = useCallback(async (id: string, status: string) => {
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
  }, [onRowChange]);

  const assignPractitioner = useCallback(async (id: string, practitionerId: string) => {
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
            ? { ...r, assigned_to: practitionerId, assigned_practitioner: pr ? { name: pr.name } : r.assigned_practitioner }
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
  }, [empanelled, onRowChange]);

  const openDraft = useCallback((r: SessionRequest) => {
    setDraft({
      open: true,
      title: `Follow-up: ${r.name}`,
      subject: `Your iqcommune session request — ${r.topic}`,
      emailBody: buildRequestFollowupEmail(r),
      waBody: buildRequestFollowupWA(r),
      recipientName: r.name,
      recipientEmail: r.email,
    });
  }, []);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Client", "Topic", "Audience", "Commit", "Venue", "Dates", "Assigned to", "Status", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isExpanded = expandedRow === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(20,18,12,.07)", cursor: "pointer", background: isExpanded ? "#f8f7f4" : undefined }}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.org} · {r.email}</div>
                      {r.phone && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.phone}</div>}
                      <div style={{ fontSize: 11, color: "#71717f", marginTop: 2 }}>
                        {new Date(r.created_at).toLocaleDateString("en-IN")}
                      </div>
                    </td>
                    <td style={tdStyle}>{r.topic}</td>
                    <td style={tdStyle}>
                      <div>{r.audience_type}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.group_size} total</div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {r.min_commit}
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}>guaranteed</div>
                    </td>
                    <td style={tdStyle}>{r.venue ?? "—"}</td>
                    <td style={tdStyle}>{r.preferred_dates}</td>
                    <td style={tdStyle}>{r.assigned_practitioner?.name ?? "—"}</td>
                    <td style={tdStyle}><StatusPill status={r.status} /></td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <select
                          value={r.status}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                          style={selectStyle}
                        >
                          {["New", "Matched", "Confirmed", "Completed", "Cancelled"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button onClick={() => openDraft(r)} style={btnStyle}>
                          Email draft
                        </button>
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
                          {/* Header */}
                          <div style={{ marginBottom: "0.9rem" }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                          </div>

                          {/* Detail grid */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem 2rem", marginBottom: "1rem" }}>
                            <Field label="Topic" value={r.topic} />
                            <Field label="Audience type" value={r.audience_type} />
                            <Field label="Group size" value={r.group_size} />
                            <Field label="Preferred dates" value={r.preferred_dates} />
                            <Field label="Venue" value={r.venue ?? "—"} />
                            <Field label="Venue notes" value={r.venue_notes ?? "—"} />
                            {r.notes && <Field label="Additional notes" value={r.notes} />}
                          </div>

                          {/* Assign practitioner */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid rgba(20,18,12,.08)", paddingTop: "0.85rem" }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>Assign to:</span>
                            <select
                              value={r.assigned_to ?? ""}
                              onChange={(e) => { if (e.target.value) assignPractitioner(r.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ ...selectStyle, flex: 1, maxWidth: 280 }}
                            >
                              <option value="">— select practitioner —</option>
                              {empanelled.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            {r.assigned_practitioner && (
                              <span style={{ fontSize: 12, color: "#2a6b2a", fontWeight: 500 }}>
                                ✓ {r.assigned_practitioner.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)", fontSize: 13 }}>
                  {data.length === 0 ? "No session requests yet" : "No requests match the current filter"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--ink)", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "var(--ink-faint)", borderBottom: "1px solid rgba(20,18,12,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const CHEVRON_GOLD = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const selectStyle: React.CSSProperties = { fontSize: 12, padding: "5px 22px 5px 8px", borderRadius: 6, border: "1px solid rgba(20,18,12,.18)", background: `${CHEVRON_GOLD} no-repeat right 7px center, #fcfbf8`, appearance: "none", WebkitAppearance: "none", color: "#14161d", cursor: "pointer", fontFamily: "inherit" };
const btnStyle: React.CSSProperties = { background: "rgba(20,18,12,.07)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" };
