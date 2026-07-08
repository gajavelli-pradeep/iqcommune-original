"use client";

import { useState, useCallback } from "react";
import { PhotoViewModal } from "@/components/admin/PhotoViewModal";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { initials } from "@/lib/format";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { downloadPhotoSet } from "@/lib/download-photos";

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

// Completed sessions with no photo upload yet (V4: "Send reminder" rows).
export interface PendingUploadSession {
  id: string;
  session_ref: string;
  practitioner_name: string;
  module: string;
  venue: string;
  session_date: string;
}

// V4 photo statuses: Pending (completed session, no upload yet) → Uploaded.
const STATUS_FILTERS = ["All", "Pending", "Uploaded"] as const;
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
  pendingSessions = [],
  statusFilter: statusFilterProp,
  onStatusFilterChange,
  onStatusChange,
}: {
  initialData: PhotoSubmission[];
  pendingSessions?: PendingUploadSession[];
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isGlobalAdmin?: boolean;
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

  // Every existing submission counts as "Uploaded" (V4). "Pending" = sessions
  // with no upload yet, so submissions are hidden under the Pending filter.
  const visible = statusFilter === "Pending" ? [] : data;
  // "Pending" rows (completed sessions, no upload) show under All + Pending.
  const pendingRows =
    statusFilter === "All" || statusFilter === "Pending" ? pendingSessions : [];

  async function sendReminder(sessionId: string, name: string) {
    const res = await fetch(`/api/admin/sessions/${sessionId}/photo-link`);
    if (!res.ok) {
      setToast("Could not generate reminder link");
      setTimeout(() => setToast(""), 3500);
      return;
    }
    const { url } = (await res.json()) as { url: string };
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — link still generated */
    }
    setToast(`Reminder link copied — send to ${name}`);
    setTimeout(() => setToast(""), 3500);
  }

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
        Photos auto-expire 30 days after submission — anything not downloaded before expiry is
        automatically deleted. To generate a practitioner photo-upload link, go to
        <strong>Sessions → Completed → Photo link</strong>, or use <strong>Send reminder</strong> on a Pending row.
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
        isEmpty={visible.length === 0 && pendingRows.length === 0}
        emptyText={
          data.length === 0 && pendingSessions.length === 0
            ? "No photo submissions yet"
            : "No submissions match the current filter"
        }
        connected
      >
        {pendingRows.map((s) => (
          <tr key={`pending-${s.id}`} style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
            <td style={TD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f5e9c8", color: "#8a6510", fontWeight: 600, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {initials(s.practitioner_name)}
                </div>
                <div style={{ fontWeight: 500 }}>{s.practitioner_name}</div>
              </div>
            </td>
            <td style={TD}><span style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{s.session_ref}</span></td>
            <td style={TD}>{s.module}</td>
            <td style={TD}>{s.venue}</td>
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            <td style={TD}>
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "var(--amber-light, #fbf1d9)", color: "var(--amber, #854f0b)", whiteSpace: "nowrap" }}>
                Pending
              </span>
            </td>
            <td style={{ ...TD, whiteSpace: "nowrap" }}>
              <button onClick={() => sendReminder(s.id, s.practitioner_name)} style={ghostBtn} title="Copy a fresh photo-upload link to send to this practitioner">
                <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Send reminder
              </button>
            </td>
          </tr>
        ))}
        {visible.map((p) => {
          const days = daysLeft(p.expiry_date);
          const isUrgent = days > 0 && days <= 7;
          const ini = initials(p.practitioner_name);
          const canView = true; // any existing submission is viewable/downloadable/deletable
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
                {days <= 0 ? (
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
              {/* Status — V4: every submission is "Uploaded" */}
              <td style={TD}>
                <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "var(--green-light, #eef7ee)", color: "var(--green, #2a6b2a)", whiteSpace: "nowrap" }}>
                  Uploaded
                </span>
              </td>
              {/* Actions */}
              <td style={TD}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
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
                  {canView && (
                    <button onClick={() => downloadPhotoSet(p.id)} style={ghostBtn} title="Download all photos in this set">
                      <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
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
          onClose={() => setViewId(null)}
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
