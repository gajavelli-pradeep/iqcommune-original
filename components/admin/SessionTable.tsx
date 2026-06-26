"use client";

import { useState, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { formatInr } from "@/lib/tds";

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
}

const STATUS_FILTERS = ["All", "Upcoming", "Completed", "Cancelled"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export function SessionTable({
  initialData,
  onNavigate,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
}: {
  initialData: Session[];
  onNavigate?: (tab: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
}) {
  // Read directly from props so newly-created sessions (added upstream) appear immediately.
  const data = initialData;
  const [internalStatus, setInternalStatus] = useState<StatusFilter>("All");
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(statusFilterProp as StatusFilter)
    ? (statusFilterProp as StatusFilter)
    : internalStatus;
  const setStatusFilter = (f: StatusFilter) => (onStatusFilterChange ? onStatusFilterChange(f) : setInternalStatus(f));
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ open: boolean; title?: string; subject?: string; emailBody?: string; waBody?: string }>({ open: false });

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
        <span style={{ fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>Filter:</span>
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

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            ...tableStyle,
            border: "1px solid rgba(20,18,12,.10)",
            borderRadius: "0 0 10px 10px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              {["Ref", "Module", "Practitioner", "Date", "Venue", "Audience", "Pax", "Payout", "Consent", "Status", ""].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
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
                    <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.ref_code}</span></td>
                    <td style={tdStyle}>{s.module}</td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.practitioner?.name ?? "—"}</div>
                      {s.practitioner?.email && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{s.practitioner.email}</div>}
                    </td>
                    <td style={tdStyle}>
                      <div>{s.session_date}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{s.start_time}–{s.end_time}</div>
                    </td>
                    <td style={tdStyle}>{s.venue}</td>
                    <td style={{ ...tdStyle, fontSize: 12 }}>{s.audience_type ?? "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{s.participants}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {formatInr(s.payout_amount)}
                      {s.tds_applicable && (
                        <div style={{ fontSize: 10, color: "#854f0b", fontWeight: 400, marginTop: 1 }}>
                          TDS {s.tds_rate ?? 0}%
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}><StatusPill status={s.consent_status} /></td>
                    <td style={tdStyle}><StatusPill status={s.status} /></td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {s.payout_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigate?.("payouts"); }}
                            style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, border: "none", background: "#c9982a", color: "#14161d", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                          >
                            Payout →
                          </button>
                        )}
                        {s.status === "Upcoming" && s.consent_status !== "Signed" && (
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
                            style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, border: "1px solid rgba(20,18,12,.18)", background: "#fff", color: "#14161d", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Send confirmation
                          </button>
                        )}
                        {s.status === "Completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `${window.location.origin}/onboarding?session=${encodeURIComponent(s.ref_code)}&mode=photos`;
                              navigator.clipboard.writeText(url).then(() => alert(`Photo link copied:\n${url}`));
                            }}
                            style={{ fontSize: 11, padding: "3px 9px", borderRadius: 100, border: "1px solid rgba(20,18,12,.18)", background: "#fff", color: "#14161d", cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Photo link
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                      <td colSpan={11} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                        <div
                          style={{
                            border: "1px solid rgba(20,18,12,.10)",
                            borderRadius: 8,
                            background: "#fff",
                            padding: "1rem 1.25rem",
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem 2rem" }}>
                            <SField label="Reference" value={s.ref_code} mono />
                            <SField label="Module" value={s.module} />
                            <SField label="Status" value={s.status} />
                            <SField label="Date" value={`${s.session_date} · ${s.start_time}–${s.end_time}`} />
                            <SField label="Venue" value={s.venue} />
                            <SField label="Audience" value={s.audience_type} />
                            <SField label="Participants" value={String(s.participants)} />
                            <SField label="Payout" value={formatInr(s.payout_amount)} />
                            {s.tds_applicable && <SField label="TDS rate" value={`${s.tds_rate ?? 0}%`} />}
                            <SField label="Consent" value={s.consent_status} />
                            <SField label="Practitioner" value={s.practitioner?.name ?? "—"} />
                            {s.practitioner?.email && <SField label="Practitioner email" value={s.practitioner.email} />}
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
                <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)", fontSize: 13 }}>
                  {data.length === 0 ? "No sessions yet" : "No sessions match the current filter"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ContactDraftModal
        open={draft.open}
        onClose={() => setDraft({ open: false })}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
      />
    </div>
  );
}

function SField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)", fontFamily: mono ? "monospace" : undefined }}>{value}</div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "var(--ink-faint)", borderBottom: "1px solid rgba(20,18,12,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
