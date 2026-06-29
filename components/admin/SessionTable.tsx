"use client";

import { useState, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";

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
type StatusFilter = (typeof STATUS_FILTERS)[number];

const HEADERS = [
  "Ref",
  "Module",
  "Practitioner",
  "Date & venue",
  "Audience",
  "Pax",
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
}: {
  initialData: Session[];
  onNavigate?: (tab: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
                  <span style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                    {s.ref_code}
                  </span>
                </td>
                <td style={TD}>{s.module}</td>
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
                    {s.start_time}–{s.end_time}
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
                            if (!res.ok) {
                              const body = (await res.json().catch(() => ({}))) as {
                                error?: string;
                              };
                              alert(body.error ?? "Could not generate photo link");
                              return;
                            }
                            const { url } = (await res.json()) as { url: string };
                            await navigator.clipboard.writeText(url);
                            alert(`Photo link copied:\n${url}`);
                          } catch {
                            alert("Failed to generate photo link. Please try again.");
                          }
                        }}
                        style={{ ...actionBtn("#fff", "#14161d", true), display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Photo link
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
