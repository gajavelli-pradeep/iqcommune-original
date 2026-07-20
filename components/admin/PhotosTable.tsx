"use client";

import { useState, useCallback, useRef } from "react";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { type RowAction } from "@/components/admin/table-types";
import { RowActionsInline } from "@/components/admin/RowActionsInline";
import { useDateFilter } from "@/lib/admin/use-date-filter";
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
  featured: boolean;
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


// V5 inline action-button icons (11×11, stroke 2) — match the mockup exactly.
const iconProps = { width: 11, height: 11, fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", "aria-hidden": true } as const;
const DownloadIcon = () => (<svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
const UploadIcon = () => (<svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);

// V6: Upload/Download are their own columns — a compact ghost pill button.
const colBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  fontSize: 11, padding: "5px 10px", borderRadius: 7,
  border: "1px solid rgba(15,17,23,.18)", background: "var(--surface)",
  color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, whiteSpace: "nowrap",
};
type StatusFilter = (typeof STATUS_FILTERS)[number];

const HEADERS = [
  "Practitioner",
  "Session ref.",
  "Module",
  "City",
  "Upload Photos",
  "Uploaded date",
  "Download Photos",
  "Expires on",
  "Days left",
  "Actions",
];

function daysLeft(expiryDate: string): number {
  return Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// "Expiring ≤7d": uploaded photos whose 30-day retention runs out within a week.
// daysLeft() reads Date.now(), which is fine in this client component.
function isExpiringSoon(expiryDate: string): boolean {
  const d = daysLeft(expiryDate);
  return d > 0 && d <= 7;
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
          background: "rgba(15,17,23,.10)",
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
  readOnly = false,
}: {
  initialData: PhotoSubmission[];
  pendingSessions?: PendingUploadSession[];
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);
  // V6 §10: admin uploads photos directly for a Completed session (co-equal path).
  const [uploadBusyId, setUploadBusyId] = useState<string | null>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
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

  // Client-side toggle for the "Expiring ≤7d" pending card (no matching status value).
  const [expiringOnly, setExpiringOnly] = useState(false);

  // Year/month filter spans both row kinds — submissions by submitted_at,
  // pending (completed-session) rows by session_date.
  const df = useDateFilter([
    ...data.map((p) => p.submitted_at),
    ...pendingSessions.map((s) => s.session_date),
  ]);

  // Every existing submission counts as "Uploaded" (V4). "Pending" = sessions
  // with no upload yet, so submissions are hidden under the Pending filter.
  // `expiringOnly` further narrows uploaded rows to those expiring within 7 days.
  const visible = (statusFilter === "Pending" ? [] : data)
    .filter((p) => df.matchesDate(p.submitted_at))
    .filter((p) => !expiringOnly || isExpiringSoon(p.expiry_date));
  // "Pending" rows (completed sessions, no upload) show under All + Pending —
  // never while the Expiring card is active (those rows have no expiry).
  const pendingRows = (
    (statusFilter === "All" || statusFilter === "Pending") && !expiringOnly ? pendingSessions : []
  )
    .filter((s) => df.matchesDate(s.session_date));

  // Pending-card counts: date-filtered, status-independent (like RequestTable).
  const pendingUploadCount = pendingSessions.filter((s) => df.matchesDate(s.session_date)).length;
  const expiringCount = data.filter(
    (p) => df.matchesDate(p.submitted_at) && isExpiringSoon(p.expiry_date)
  ).length;


  function chooseUpload(sessionId: string) {
    uploadTargetRef.current = sessionId;
    uploadInputRef.current?.click();
  }

  async function onUploadFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const sessionId = uploadTargetRef.current;
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!sessionId || files.length === 0) return;
    setUploadBusyId(sessionId);
    setToast("Uploading…");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      for (const f of files) fd.append("photos", f);
      const res = await fetch("/api/admin/photos/upload", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!res.ok) {
        setToast(body.error ?? "Upload failed");
        setTimeout(() => setToast(""), 4000);
        return;
      }
      setToast(`Uploaded ${body.count} photo${body.count === 1 ? "" : "s"} — refreshing…`);
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setToast("Network error — please try again.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setUploadBusyId(null);
    }
  }

  // Download every photo in the set. Reports a partial save rather than letting
  // files go missing quietly — the browser can still refuse a save.
  async function downloadSet(p: PhotoSubmission) {
    if (downloadBusyId) return; // guard against a second concurrent request
    setDownloadBusyId(p.id);
    setToast("Preparing download…");
    const { ok, error } = await downloadPhotoSet(p.id);
    setDownloadBusyId(null);
    setToast(ok ? "Photos downloaded" : (error ?? "Download failed — please retry."));
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


  return (
    <div>
      {/* V6 §10: admin direct-upload picker (hidden; opened per pending row). */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        onChange={onUploadFilesPicked}
      />

      <PendingBar
        pendingCards={[
          {
            count: pendingUploadCount,
            label: "Not yet uploaded",
            active: statusFilter === "Pending",
            onToggle: () => {
              setExpiringOnly(false);
              setStatusFilter(statusFilter === "Pending" ? "All" : "Pending");
            },
          },
          {
            count: expiringCount,
            label: "Expiring within 7 days",
            active: expiringOnly,
            onToggle: () => {
              const next = !expiringOnly;
              setExpiringOnly(next);
              if (next && statusFilter === "Pending") setStatusFilter("All");
            },
          },
        ]}
        dateFilter={df.control}
        dateLabel="Session date:"
      />

      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0 && pendingRows.length === 0}
        emptyText={
          data.length === 0 && pendingSessions.length === 0 ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-muted)", marginBottom: 4 }}>No completed sessions yet</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                Once a session is marked Completed, it&apos;ll appear here — either with photos uploaded, or pending from the practitioner.
              </div>
            </div>
          ) : (
            "No submissions match the current filter"
          )
        }
        connected
      >
        {pendingRows.map((s) => (
          <tr key={`pending-${s.id}`} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
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
            {/* Upload Photos — admin uploads on the practitioner's behalf */}
            <td style={TD}>
              {!readOnly && (
                <button type="button" onClick={() => chooseUpload(s.id)} disabled={uploadBusyId === s.id} style={{ ...colBtn, opacity: uploadBusyId === s.id ? 0.6 : 1 }}>
                  <UploadIcon />{uploadBusyId === s.id ? "Uploading…" : "Upload"}
                </button>
              )}
            </td>
            {/* Uploaded date */}
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            {/* Download Photos */}
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            {/* Expires on */}
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            {/* Days left */}
            <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
            {/* Actions — V6: pending (no upload) rows show just a dash */}
            <td style={{ ...TD, whiteSpace: "nowrap", textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
            </td>
          </tr>
        ))}
        {visible.map((p) => {
          const days = daysLeft(p.expiry_date);
          const ini = initials(p.practitioner_name);
          return (
            <tr key={p.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
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
              {/* Upload Photos — already uploaded */}
              <td style={{ ...TD, color: "var(--ink-faint)" }}>—</td>
              {/* Uploaded date */}
              <td style={TD}>
                <div style={{ fontSize: 12 }}>
                  {new Date(p.submitted_at).toLocaleDateString("en-IN")}
                </div>
              </td>
              {/* Download Photos */}
              <td style={TD}>
                <button type="button" onClick={() => void downloadSet(p)} disabled={downloadBusyId === p.id} style={{ ...colBtn, opacity: downloadBusyId === p.id ? 0.6 : 1 }}>
                  <DownloadIcon />{downloadBusyId === p.id ? "Downloading…" : "Download"}
                </button>
              </td>
              {/* Expires on */}
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
              </td>
              {/* Actions — V6: single red Delete only */}
              <td style={{ ...TD, textAlign: "right" }}>
                <RowActionsInline
                  ariaLabel={`Actions for ${p.session_ref}`}
                  actions={
                    !readOnly
                      ? [{ label: "Delete", danger: true, onClick: () => remove(p.id) } as RowAction]
                      : []
                  }
                />
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
