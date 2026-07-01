"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { PhotoViewModal } from "@/components/admin/PhotoViewModal";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { initials } from "@/lib/format";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

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

const STATUS_FILTERS = ["All", "Pending", "Approved", "Rejected", "Expired"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const HEADERS = [
  "Practitioner",
  "Session",
  "Module",
  "City",
  "Submitted",
  "Expires",
  "Days left",
  "Photos",
  "Status",
  "Actions",
];

function daysLeft(expiryDate: string): number {
  return Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function ExpiryBar({ days }: { days: number }) {
  const pct = Math.min(100, Math.max(0, (days / 30) * 100));
  const color = days <= 5 ? "#a32d2d" : days <= 10 ? "#854f0b" : "#2a6b2a";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 60,
          height: 4,
          borderRadius: 100,
          background: "rgba(20,18,12,.10)",
          overflow: "hidden",
        }}
      >
        <div
          style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100 }}
        />
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
  isSuperAdmin = false,
}: {
  initialData: PhotoSubmission[];
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isSuperAdmin?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const [internalFilter, setInternalFilter] = useState<StatusFilter>("All");
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(
    statusFilterProp as StatusFilter
  )
    ? (statusFilterProp as StatusFilter)
    : internalFilter;
  const setStatusFilter = (f: StatusFilter) =>
    onStatusFilterChange ? onStatusFilterChange(f) : setInternalFilter(f);

  const visible = data.filter((p) =>
    statusFilter === "All" ? true : p.status === statusFilter
  );

  const reject = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/photos/${id}/reject`, { method: "PATCH" });
      if (res.ok) {
        setData((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Rejected" } : p)));
        onStatusChange?.(id, "Rejected");
        setToast("Photo submission rejected");
        setTimeout(() => setToast(""), 3000);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(body.error ?? "Rejection failed");
        setTimeout(() => setToast(""), 4000);
      }
    },
    [onStatusChange]
  );

  const approve = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/photos/${id}/approve`, { method: "PATCH" });
      if (res.ok) {
        setData((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" } : p)));
        onStatusChange?.(id, "Approved");
        setToast("Photo set approved");
        setTimeout(() => setToast(""), 3000);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(body.error ?? "Approval failed");
        setTimeout(() => setToast(""), 4000);
      }
    },
    [onStatusChange]
  );

  const remove = useCallback(
    (id: string) => {
      setConfirmDialog({
        open: true,
        title: "Delete photo set",
        description: "This will permanently remove this photo submission and cannot be undone.",
        onConfirm: async () => {
          setConfirmDialog((d) => ({ ...d, open: false }));
          const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
          if (res.ok) {
            setData((prev) => prev.filter((p) => p.id !== id));
            onStatusChange?.(id, "Deleted");
            setToast("Photo set deleted");
            setTimeout(() => setToast(""), 3000);
          } else {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            setToast(body.error ?? "Delete failed");
            setTimeout(() => setToast(""), 4000);
          }
        },
      });
    },
    [onStatusChange]
  );

  const viewingRow = viewId ? (data.find((p) => p.id === viewId) ?? null) : null;

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
        Photos auto-expire 30 days after submission. Anything not approved before expiry is
        automatically deleted — no action needed. To generate a practitioner photo-upload link, go
        to <strong>Sessions → Completed → Photo link</strong>.
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
      </div>

      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={
          data.length === 0
            ? "No photo submissions yet"
            : "No submissions match the current filter"
        }
        connected
      >
        {visible.map((p) => {
          const days = daysLeft(p.expiry_date);
          const isUrgent = days <= 7 && p.status === "Pending";
          const ini = initials(p.practitioner_name);
          const canView = p.status === "Pending" || p.status === "Approved" || p.status === "Rejected";
          return (
            <tr key={p.id} style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
              {/* Practitioner */}
              <td style={TD}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#f5e9c8",
                      color: "#8a6510",
                      fontWeight: 600,
                      fontSize: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {ini}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.practitioner_name}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--ink-faint)" }}>
                      {p.practitioner_ref}
                    </div>
                  </div>
                </div>
              </td>
              {/* Session */}
              <td style={TD}>
                <span style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                  {p.session_ref}
                </span>
              </td>
              {/* Module */}
              <td style={{ ...TD, maxWidth: 180 }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.module}</div>
              </td>
              {/* City */}
              <td style={TD}>
                <div>{p.city}</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.state}</div>
              </td>
              {/* Submitted */}
              <td style={TD}>
                <div style={{ fontSize: 12 }}>
                  {new Date(p.submitted_at).toLocaleDateString("en-IN")}
                </div>
              </td>
              {/* Expires */}
              <td style={{ ...TD, fontSize: 12, color: "var(--ink-faint)" }}>
                {new Date(p.expiry_date).toLocaleDateString("en-IN")}
              </td>
              {/* Days left */}
              <td style={TD}>
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
              {/* Photos */}
              <td style={{ ...TD, textAlign: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.photo_count}</span>
              </td>
              {/* Status */}
              <td style={TD}>
                <StatusPill status={p.status} />
              </td>
              {/* Actions */}
              <td style={{ ...TD, whiteSpace: "nowrap" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {p.status === "Pending" && (
                    <button onClick={() => approve(p.id)} style={goldBtn}>
                      Approve
                    </button>
                  )}
                  {p.status === "Pending" && (
                    <button onClick={() => reject(p.id)} style={ghostBtn}>
                      Reject
                    </button>
                  )}
                  {p.status === "Approved" && (
                    <button onClick={() => reject(p.id)} style={ghostBtn}>
                      Revoke
                    </button>
                  )}
                  {canView && (
                    <button onClick={() => setViewId(p.id)} style={ghostBtn}>
                      <svg
                        width={12}
                        height={12}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                  )}
                  {canView && p.status !== "Rejected" && (
                    <button onClick={() => remove(p.id)} style={ghostBtn}>
                      Delete
                    </button>
                  )}
                  {!canView && (
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
                  )}
                </div>
              </td>
            </tr>
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

      {viewId && viewingRow && (
        <PhotoViewModal
          id={viewId}
          practitionerName={viewingRow.practitioner_name}
          status={viewingRow.status}
          onClose={() => setViewId(null)}
          onApprove={viewingRow.status === "Pending" ? approve : undefined}
          onReject={viewingRow.status === "Pending" || viewingRow.status === "Approved" ? reject : undefined}
          onDelete={viewingRow.status !== "Rejected" ? remove : undefined}
        />
      )}
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

const goldBtn: React.CSSProperties = {
  background: "#c9982a",
  color: "#14161d",
  border: "none",
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtn: React.CSSProperties = {
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
};
