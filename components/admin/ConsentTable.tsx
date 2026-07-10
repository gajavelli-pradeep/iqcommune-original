"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { TableFilterBar } from "@/components/admin/TableFilterBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { matchesSearch } from "@/lib/admin/search";

export type ConfirmationRow = Database["public"]["Tables"]["confirmations"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};

const CONSENT_FILTERS = ["All", "Awaiting consent", "Consent received", "Superseded"] as const;

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    "Awaiting consent": { bg: "#fbf1d9", fg: "#8a6510" },
    "Consent received": { bg: "#eef7ee", fg: "#2a6b2a" },
    Superseded: { bg: "#f1f0ec", fg: "#71717f" },
  };
  const c = map[status] ?? map.Superseded;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "10px 12px", borderBottom: "1px solid rgba(20,18,12,.10)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "11px 12px", borderBottom: "1px solid rgba(20,18,12,.06)", verticalAlign: "middle" };
const actionBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(20,18,12,0.18)", borderRadius: 100,
  padding: "5px 11px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--ink)", fontFamily: "inherit", whiteSpace: "nowrap",
};

export function ConsentTable({
  initialData,
  onRowChange,
}: {
  initialData: ConfirmationRow[];
  onRowChange: (id: string, patch: Partial<ConfirmationRow>) => void;
  isGlobalAdmin?: boolean;
}) {
  const data = initialData;
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const df = useDateFilter(data.map((r) => r.issued_on));
  const visible = (filter === "All" ? data : data.filter((r) => r.status === filter))
    .filter((r) => df.matchesDate(r.issued_on))
    .filter((r) => matchesSearch(search, r.ref_code, r.session_ref, r.practitioner?.name, r.status, r.gross_amount, r.net_amount));

  async function copyLink(row: ConfirmationRow) {
    if (!row.consent_link) return;
    try {
      await navigator.clipboard.writeText(row.consent_link);
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 2000);
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

  if (data.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "2.5rem", textAlign: "center", fontSize: 13, color: "var(--ink-faint)" }}>
        No confirmations yet. Use <strong>Generate consent</strong> to create one for an upcoming session.
      </div>
    );
  }

  return (
    <div>
      <TableFilterBar options={CONSENT_FILTERS} value={filter} onChange={setFilter} dateFilter={df.control} search={search} onSearchChange={setSearch} searchPlaceholder="Search consent…" />
      <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
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
              return (
                <tr key={row.id}>
                  <td style={{ ...td, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{row.ref_code}</td>
                  <td style={{ ...td, color: "var(--ink-muted)" }}>{row.session_ref}</td>
                  <td style={td}>{row.practitioner?.name ?? "—"}</td>
                  <td style={{ ...td, textAlign: "right", color: "var(--ink-muted)" }}>{money(row.gross_amount)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{money(row.net_amount)}</td>
                  <td style={td}><StatusPill status={row.status} /></td>
                  <td style={{ ...td, color: "var(--ink-faint)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {new Date(row.issued_on).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {row.consent_link && (
                        <button style={actionBtn} onClick={() => copyLink(row)}>
                          {copiedId === row.id ? "Copied" : "Copy link"}
                        </button>
                      )}
                      <button
                        style={{ ...actionBtn, opacity: row.storage_path ? 1 : 0.5, cursor: row.storage_path ? "pointer" : "not-allowed" }}
                        disabled={!row.storage_path}
                        title={row.storage_path ? "Download consent PDF" : "No PDF available yet"}
                        onClick={() => downloadPdf(row)}
                      >
                        PDF
                      </button>
                      {awaiting && (
                        <button
                          style={{ ...actionBtn, borderColor: "var(--green-border, #bcdcbc)", color: "#2a6b2a" }}
                          disabled={busy === row.id}
                          onClick={() => markReceived(row)}
                        >
                          {busy === row.id ? "…" : "Mark received"}
                        </button>
                      )}
                    </div>
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
