"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { PendingBar } from "@/components/admin/PendingBar";
import { StatusSelect } from "@/components/shared/StatusPill";
import { useDateFilter } from "@/lib/admin/use-date-filter";

export type ConfirmationRow = Database["public"]["Tables"]["confirmations"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};


const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// V6: pending consent is RED, received is green (matching the mockup). The
// underlying status values are unchanged — only colour + shown label are remapped.
const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  "Awaiting consent": { bg: "var(--red-light)", fg: "var(--red)" },
  "Consent received": { bg: "var(--green-light)", fg: "var(--green)" },
  Superseded: { bg: "var(--surface-sunken)", fg: "var(--ink-faint)" },
};
const STATUS_LABEL: Record<string, string> = {
  "Awaiting consent": "Pending",
  "Consent received": "Received",
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.Superseded;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Consent-email delivery indicator, shown under the status pill on rows still
// awaiting consent — the one place "did it reach the practitioner?" is actionable.

// A pill-shaped, status-tinted <select> — the Global-Admin override control.
const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "10px 12px", borderBottom: "1px solid rgba(15,17,23,.10)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "11px 12px", borderBottom: "1px solid rgba(15,17,23,.06)", verticalAlign: "middle" };

// V6: gold uppercase section labels that structure the Session Consent tab.
export const consentPartLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--gold-dark)",
  margin: "1.25rem 0 0.6rem",
};


export function ConsentTable({
  initialData,
  readOnly = false,
  sessionStatusById = {},
  beforeTable,
}: {
  initialData: ConfirmationRow[];
  onRowChange: (id: string, patch: Partial<ConfirmationRow>) => void;
  isGlobalAdmin?: boolean;
  // Read-only User tier: view + download (PDF) only, no share/mutation actions.
  readOnly?: boolean;
  // Sessions still Upcoming — only these have an editable status + Replace action.
  reassignableSessionIds?: string[];
  onReassign?: (row: ConfirmationRow) => void;
  // Global-Admin status override applied; parent reconciles the confirmation + session.
  onStatusOverridden?: (row: ConfirmationRow, status: string) => void;
  // V6 Session-status column: linked session's status (sessions.id → status),
  // threaded from the parent (kept fresh by the sessions realtime subscription).
  sessionStatusById?: Record<string, string>;
  // V5: content rendered between the filter bar and the table (the generate card),
  // so the PendingBar/filters sit above it as in the mockup.
  beforeTable?: React.ReactNode;
}) {
  const router = useRouter();
  const data = initialData;
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  // V6: the Session-status column is an editable dropdown; local optimistic override.
  const [sessStatus, setSessStatus] = useState<Record<string, string>>({});

  async function patchSessionStatus(sessionId: string, next: string) {
    const prev = sessStatus[sessionId] ?? sessionStatusById[sessionId];
    setSessStatus((m) => ({ ...m, [sessionId]: next }));
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) { setSessStatus((m) => ({ ...m, [sessionId]: prev })); setError("Couldn't update the session status."); }
    } catch {
      setSessStatus((m) => ({ ...m, [sessionId]: prev }));
      setError("Network error — the session status wasn't changed.");
    }
  }
  const df = useDateFilter(data.map((r) => r.issued_on));
  const visible = (filter === "All" ? data : data.filter((r) => r.status === filter))
    .filter((r) => df.matchesDate(r.issued_on));
  const pendingCount = data.filter((r) => r.status === "Awaiting consent" && df.matchesDate(r.issued_on)).length;


  async function downloadPdf(row: ConfirmationRow) {
    if (!row.storage_path) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/consent/${row.id}/download`);
      if (!res.ok) { setError("Could not download the consent PDF."); return; }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank");
    } catch {
      setError("Network error — please try again.");
    }
  }





  if (data.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid rgba(15,17,23,.10)", borderRadius: 10, padding: "2.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-muted)", marginBottom: 4 }}>No confirmations generated yet</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
          Select a Matched session above to generate its revenue confirmation.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PendingBar
        pendingCards={[{ count: pendingCount, label: "Signed copy not yet received", active: filter === "Awaiting consent", onToggle: () => setFilter(filter === "Awaiting consent" ? "All" : "Awaiting consent") }]}
        dateFilter={df.control}
        dateLabel="Issued in:"
        standalone={!!beforeTable}
      />
      {beforeTable}
      {/* V6 Part-2 section label + manual refresh (mockup: "Check for updates now") */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1.25rem 0 0.6rem" }}>
        <div style={{ ...consentPartLabel, margin: 0 }}>Part 2 — Track Status</div>
        <button
          type="button"
          onClick={() => router.refresh()}
          style={{ fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(15,17,23,.18)", background: "#fff", color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          Check for updates now
        </button>
      </div>
      {/* V6: the table is its own card, separate from the pending bar above. */}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(15,17,23,.10)", borderRadius: 10, overflow: "hidden" }}>
      {error && <div role="alert" style={{ fontSize: 12, color: "#a32d2d", padding: "8px 12px" }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Confirmation ref.</th>
              <th style={th}>Session</th>
              <th style={th}>Practitioner</th>
              <th style={{ ...th, textAlign: "right" }}>Gross payout</th>
              <th style={{ ...th, textAlign: "right" }}>Net payout</th>
              <th style={th}>Consent status</th>
              <th style={th}>Download Signed Consent</th>
              <th style={th}>Session status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
                  No confirmations match the current filter
                </td>
              </tr>
            )}
            {visible.map((row) => {
              return (
                <tr key={row.id}>
                  <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{row.ref_code}</td>
                  <td style={{ ...td, color: "var(--ink-muted)" }}>{row.session_ref}</td>
                  <td style={td}>{row.practitioner?.name ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--ink-muted)" }}>{money(row.gross_amount)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(row.net_amount)}</td>
                  <td style={td}>
                    <StatusPill status={row.status} />
                  </td>
                  {/* Download Signed Consent — own column (mirrors the Agreements tab) */}
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => downloadPdf(row)}
                      disabled={!row.storage_path}
                      title={row.storage_path ? undefined : "No signed consent file yet"}
                      style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 100,
                        border: "1px solid rgba(15,17,23,.18)", background: "#fff",
                        color: row.storage_path ? "var(--ink-soft)" : "var(--ink-faint)",
                        cursor: row.storage_path ? "pointer" : "not-allowed",
                        opacity: row.storage_path ? 1 : 0.5, fontFamily: "inherit", fontWeight: 500,
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download
                    </button>
                  </td>
                  {/* Session status — V6: editable dropdown only (mockup has no ops menu). */}
                  <td style={td} onClick={(e) => e.stopPropagation()}>
                    {sessionStatusById[row.session_id] ? (
                      <StatusSelect
                        value={sessStatus[row.session_id] ?? sessionStatusById[row.session_id]}
                        options={["Upcoming", "Completed", "Cancelled"]}
                        labels={{ Upcoming: "Pending", Completed: "Confirmed", Cancelled: "Cancelled" }}
                        disabled={readOnly}
                        ariaLabel={`Session status for ${row.ref_code}`}
                        onChange={(next) => patchSessionStatus(row.session_id, next)}
                      />
                    ) : (
                      <span style={{ color: "var(--ink-faint)" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}
