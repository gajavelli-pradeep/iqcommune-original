"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { PhotoViewModal } from "@/components/admin/PhotoViewModal";

interface PhotoSubmission {
  id: string;
  practitioner_ref: string;
  practitioner_name: string;
  session_ref: string;
  module: string;
  city: string;
  state: string;
  photo_count: number;
  status: string;
  submitted_at: string;
  expiry_date: string;
}

function daysLeft(expiryDate: string): number {
  const now  = new Date();
  const end  = new Date(expiryDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Expired"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

function ExpiryBar({ days }: { days: number }) {
  const pct  = Math.min(100, Math.max(0, (days / 30) * 100));
  const color = days <= 5 ? "#a32d2d" : days <= 10 ? "#854f0b" : "#2a6b2a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 4, borderRadius: 100, background: "rgba(20,18,12,.10)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 500, whiteSpace: "nowrap" }}>{days}d</span>
    </div>
  );
}

export function PhotosTable({
  initialData,
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  onStatusChange,
}: {
  initialData: PhotoSubmission[];
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [internalFilter, setInternalFilter] = useState<StatusFilter>("All");
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(statusFilterProp as StatusFilter)
    ? (statusFilterProp as StatusFilter)
    : internalFilter;
  const setStatusFilter = (f: StatusFilter) =>
    onStatusFilterChange ? onStatusFilterChange(f) : setInternalFilter(f);

  const visible = data.filter((p) =>
    statusFilter === "All" ? true : p.status === statusFilter
  );

  const approve = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/photos/${id}/approve`, { method: "PATCH" });
    if (res.ok) {
      setData((prev) => prev.map((p) => p.id === id ? { ...p, status: "Approved" } : p));
      onStatusChange?.(id, "Approved");
      setToast("Photo set approved");
      setTimeout(() => setToast(""), 3000);
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setToast(body.error ?? "Approval failed");
      setTimeout(() => setToast(""), 4000);
    }
  }, [onStatusChange]);

  const remove = useCallback(async (id: string) => {
    if (!confirm("Delete this photo set? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev.filter((p) => p.id !== id));
      onStatusChange?.(id, "Deleted");
      setToast("Photo set deleted");
      setTimeout(() => setToast(""), 3000);
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setToast(body.error ?? "Delete failed");
      setTimeout(() => setToast(""), 4000);
    }
  }, [onStatusChange]);

  const viewingRow = viewId ? data.find((p) => p.id === viewId) ?? null : null;

  return (
    <div>
      {/* Storage notice */}
      <div
        style={{
          background: "#f5e9c8",
          border: "1px solid var(--gold-border)",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 16,
          fontSize: 12,
          color: "#8a6510",
          lineHeight: 1.5,
        }}
      >
        Photos auto-expire 30 days after submission. Anything not approved before expiry is automatically deleted — no action needed. To generate a practitioner photo-upload link, go to <strong>Sessions → Completed → Photo link</strong>.
      </div>

      {/* Filter chips */}
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
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            border: "1px solid rgba(20,18,12,.10)",
            borderRadius: "0 0 10px 10px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              {["Practitioner", "Session", "Module", "City", "Submitted", "Expires", "Days left", "Photos", "Status", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const days = daysLeft(p.expiry_date);
              const isUrgent = days <= 7 && p.status === "Pending";
              const ini = initials(p.practitioner_name);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                  {/* Practitioner — avatar + name (primary) + ref (secondary, monospace) */}
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f5e9c8", color: "#8a6510", fontWeight: 600, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {ini}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.practitioner_name}</div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--ink-faint)" }}>{p.practitioner_ref}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{p.session_ref}</span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 180 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.module}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{p.city}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.state}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12 }}>
                      {new Date(p.submitted_at).toLocaleDateString("en-IN")}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--ink-faint)" }}>
                    {new Date(p.expiry_date).toLocaleDateString("en-IN")}
                  </td>
                  <td style={tdStyle}>
                    {p.status === "Expired" ? (
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>Expired</span>
                    ) : (
                      <ExpiryBar days={days} />
                    )}
                    {isUrgent && (
                      <div style={{ fontSize: 10, color: "#a32d2d", marginTop: 2, fontWeight: 500 }}>
                        ↑ urgent
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.photo_count}</span>
                  </td>
                  <td style={tdStyle}><StatusPill status={p.status} /></td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {p.status === "Pending" && (
                        <button
                          onClick={() => approve(p.id)}
                          style={{
                            background: "#c9982a",
                            color: "#14161d",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Approve
                        </button>
                      )}
                      {/* View is always present for Pending and Approved */}
                      {(p.status === "Pending" || p.status === "Approved") && (
                        <button
                          onClick={() => setViewId(p.id)}
                          style={{
                            background: "rgba(20,18,12,.07)",
                            color: "var(--ink)",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          View
                        </button>
                      )}
                      {(p.status === "Pending" || p.status === "Approved") && (
                        <button
                          onClick={() => remove(p.id)}
                          style={{
                            background: "rgba(20,18,12,.07)",
                            color: "var(--ink)",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 11,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Delete
                        </button>
                      )}
                      {p.status !== "Pending" && p.status !== "Approved" && (
                        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
                  {data.length === 0 ? "No photo submissions yet" : "No submissions match the current filter"}
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

      {viewId && viewingRow && (
        <PhotoViewModal
          id={viewId}
          practitionerName={viewingRow.practitioner_name}
          status={viewingRow.status}
          onClose={() => setViewId(null)}
          onApprove={viewingRow.status === "Pending" ? approve : undefined}
          onDelete={remove}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  background: "#f8f7f4",
  fontWeight: 500,
  fontSize: 11,
  color: "var(--ink-faint)",
  borderBottom: "1px solid rgba(20,18,12,.1)",
};
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
