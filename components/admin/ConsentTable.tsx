"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { PendingBar } from "@/components/admin/PendingBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActionsMenu } from "@/components/admin/RowActionsMenu";
import { useDateFilter } from "@/lib/admin/use-date-filter";

export type ConfirmationRow = Database["public"]["Tables"]["confirmations"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};

const CONSENT_FILTERS = ["All", "Awaiting consent", "Consent received", "Superseded"] as const;
const CONSENT_STATUSES = ["Awaiting consent", "Consent received", "Superseded"] as const;

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  "Awaiting consent": { bg: "#fbf1d9", fg: "#8a6510" },
  "Consent received": { bg: "#eef7ee", fg: "#2a6b2a" },
  Superseded: { bg: "#f1f0ec", fg: "#71717f" },
};

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.Superseded;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

// A pill-shaped, status-tinted <select> — the Global-Admin override control.
function statusSelectStyle(status: string): React.CSSProperties {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.Superseded;
  return {
    padding: "4px 8px", borderRadius: 100, border: `1px solid ${c.fg}33`,
    background: c.bg, color: c.fg, fontFamily: "inherit", fontSize: 12, fontWeight: 600,
    cursor: "pointer", outline: "none",
  };
}

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "10px 12px", borderBottom: "1px solid rgba(20,18,12,.10)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "11px 12px", borderBottom: "1px solid rgba(20,18,12,.06)", verticalAlign: "middle" };

export function ConsentTable({
  initialData,
  onRowChange,
  isGlobalAdmin = false,
  reassignableSessionIds = [],
  onReassign,
  onStatusOverridden,
  beforeTable,
}: {
  initialData: ConfirmationRow[];
  onRowChange: (id: string, patch: Partial<ConfirmationRow>) => void;
  isGlobalAdmin?: boolean;
  // Sessions still Upcoming — only these have an editable status + Replace action.
  reassignableSessionIds?: string[];
  onReassign?: (row: ConfirmationRow) => void;
  // Global-Admin status override applied; parent reconciles the confirmation + session.
  onStatusOverridden?: (row: ConfirmationRow, status: string) => void;
  // V5: content rendered between the filter bar and the table (the generate card),
  // so the PendingBar/filters sit above it as in the mockup.
  beforeTable?: React.ReactNode;
}) {
  const data = initialData;
  const reassignable = new Set(reassignableSessionIds);
  const [supersedeTarget, setSupersedeTarget] = useState<ConfirmationRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const df = useDateFilter(data.map((r) => r.issued_on));
  const visible = (filter === "All" ? data : data.filter((r) => r.status === filter))
    .filter((r) => df.matchesDate(r.issued_on));
  const pendingCount = data.filter((r) => r.status === "Awaiting consent" && df.matchesDate(r.issued_on)).length;

  async function copyLink(row: ConfirmationRow) {
    if (!row.consent_link) return;
    try {
      await navigator.clipboard.writeText(row.consent_link);
    } catch {
      /* clipboard blocked */
    }
  }

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

  async function markReceived(row: ConfirmationRow) {
    setError("");
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/consent/${row.id}/mark-received`, { method: "PATCH" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not mark received.");
      } else {
        onRowChange(row.id, { status: "Consent received" });
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  // Global-Admin direct status override. Superseding is confirmed first (destructive);
  // Awaiting ↔ Consent received flip freely (reversible via the same control).
  async function overrideStatus(row: ConfirmationRow, status: string) {
    setError("");
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/global/consent/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not update the status.");
      } else {
        onStatusOverridden?.(row, status);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(null);
      setSupersedeTarget(null);
    }
  }

  if (data.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "2.5rem", textAlign: "center", fontSize: 13, color: "var(--ink-faint)" }}>
        No confirmations yet. Use <strong>Generate consent</strong> to create one for an upcoming session.
      </div>
    );
  }

  return (
    <div>
      <PendingBar
        pendingCards={[{ count: pendingCount, label: "Awaiting consent", active: filter === "Awaiting consent", onToggle: () => setFilter(filter === "Awaiting consent" ? "All" : "Awaiting consent") }]}
        statusOptions={CONSENT_FILTERS}
        statusValue={filter}
        onStatusChange={setFilter}
        statusAriaLabel="Filter confirmations by status"
        dateFilter={df.control}
        standalone={!!beforeTable}
      />
      {beforeTable}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderTop: beforeTable ? undefined : "none", borderRadius: beforeTable ? 10 : "0 0 10px 10px", overflow: "hidden" }}>
      {error && <div role="alert" style={{ fontSize: 12, color: "#a32d2d", padding: "8px 12px" }}>{error}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={th}>Confirmation ref.</th>
              <th style={th}>Session</th>
              <th style={th}>Practitioner</th>
              <th style={{ ...th, textAlign: "right" }}>Gross</th>
              <th style={{ ...th, textAlign: "right" }}>Net payout</th>
              <th style={th}>Status</th>
              <th style={th}>Issued</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
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
              const awaiting = row.status === "Awaiting consent";
              // Editable only while the session is still Upcoming — a Completed/Cancelled
              // session's confirmation is a historical record, shown read-only.
              const editable = isGlobalAdmin && reassignable.has(row.session_id);
              return (
                <tr key={row.id}>
                  <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{row.ref_code}</td>
                  <td style={{ ...td, color: "var(--ink-muted)" }}>{row.session_ref}</td>
                  <td style={td}>{row.practitioner?.name ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--ink-muted)" }}>{money(row.gross_amount)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(row.net_amount)}</td>
                  <td style={td}>
                    {editable ? (
                      <select
                        value={row.status}
                        disabled={busy === row.id}
                        aria-label={`Override status for ${row.ref_code}`}
                        style={statusSelectStyle(row.status)}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === row.status) return;
                          if (next === "Superseded") setSupersedeTarget(row);
                          else overrideStatus(row, next);
                        }}
                      >
                        {CONSENT_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusPill status={row.status} />
                    )}
                  </td>
                  <td style={{ ...td, color: "var(--ink-faint)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(row.issued_on).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <RowActionsMenu
                      ariaLabel={`Actions for ${row.ref_code}`}
                      actions={[
                        ...(row.consent_link ? [{ label: "Copy consent link", onClick: () => copyLink(row) }] : []),
                        ...(row.storage_path ? [{ label: "Download PDF", onClick: () => downloadPdf(row) }] : []),
                        // Regular admins get Mark received here; Global Admins use the status dropdown.
                        ...(!isGlobalAdmin && awaiting ? [{ label: "Mark received", onClick: () => markReceived(row) }] : []),
                        ...(isGlobalAdmin && onReassign && row.status !== "Superseded" && reassignable.has(row.session_id)
                          ? [{ label: "Replace practitioner", onClick: () => onReassign(row) }]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      <ConfirmDialog
        open={!!supersedeTarget}
        title="Supersede this confirmation?"
        description={`This voids ${supersedeTarget?.ref_code ?? "this confirmation"} and resets the session to Pending consent, so a corrected confirmation can be re-issued. The practitioner's current consent no longer applies.`}
        confirmLabel="Supersede"
        onCancel={() => setSupersedeTarget(null)}
        onConfirm={() => supersedeTarget && overrideStatus(supersedeTarget, "Superseded")}
      />
    </div>
  );
}
