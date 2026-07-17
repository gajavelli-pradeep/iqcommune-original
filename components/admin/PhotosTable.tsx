"use client";

import { useState, useCallback } from "react";
import { PhotoViewModal } from "@/components/admin/PhotoViewModal";
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

// V5-MATCH: the mockup's Photos row actions (inline icon buttons) are
// Send reminder (pending) and View / Download / Delete (uploaded, Delete admin-gated).
// Only "Feature in gallery" is off-spec — gated off (re-enablable improvement).
const SHOW_OFFSPEC_ACTIONS = false;

// V5 inline action-button icons (11×11, stroke 2) — match the mockup exactly.
const iconProps = { width: 11, height: 11, fill: "none", stroke: "currentColor", strokeWidth: 2, viewBox: "0 0 24 24", "aria-hidden": true } as const;
const ImageIcon = () => (<svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>);
const DownloadIcon = () => (<svg {...iconProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
const BellIcon = () => (<svg {...iconProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
type StatusFilter = (typeof STATUS_FILTERS)[number];

const HEADERS = [
  "Practitioner",
  "Session ref.",
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
  readOnly = false,
  canGallery = false,
}: {
  initialData: PhotoSubmission[];
  pendingSessions?: PendingUploadSession[];
  statusFilter?: string;
  onStatusFilterChange?: (f: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  // Whether this admin may feature photos in the public gallery (gallery access + not read-only).
  canGallery?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);
  const [galleryBusyId, setGalleryBusyId] = useState<string | null>(null);
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

  // Download every photo in the set. Reports a partial save rather than letting
  // files go missing quietly — the browser can still refuse a save.
  async function downloadSet(p: PhotoSubmission) {
    if (downloadBusyId) return; // a second run would interleave saves
    setDownloadBusyId(p.id);
    setToast("Preparing download…");
    const { ok, saved, total, error } = await downloadPhotoSet(p.id);
    setDownloadBusyId(null);
    if (error) setToast(error);
    else if (ok) setToast(saved === 1 ? "1 photo downloaded" : `${saved} photos downloaded`);
    else setToast(`Only ${saved} of ${total} photos downloaded — please retry.`);
    setTimeout(() => setToast(""), 3500);
  }

  // Feature / un-feature this photo set in the public "Sessions in the room" gallery.
  async function toggleGallery(p: PhotoSubmission) {
    const next = !p.featured;
    setGalleryBusyId(p.id);
    setData((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: next } : x)));
    try {
      const res = await fetch(`/api/admin/photos/${p.id}/gallery`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setData((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !next } : x)));
        setToast(body.error ?? "Could not update the gallery");
      } else {
        setToast(next ? "Added to the public gallery" : "Removed from the public gallery");
      }
    } catch {
      setData((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !next } : x)));
      setToast("Network error — please try again.");
    } finally {
      setGalleryBusyId(null);
      setTimeout(() => setToast(""), 3500);
    }
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
        <strong>Session Details → Completed → Photo link</strong>, or use <strong>Send reminder</strong> on a Pending row.
      </div>

      <PendingBar
        pendingCards={[
          {
            count: pendingUploadCount,
            label: "Pending from practitioner",
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
            <td style={{ ...TD, whiteSpace: "nowrap", textAlign: "right" }}>
              <RowActionsInline
                ariaLabel={`Actions for ${s.session_ref}`}
                actions={readOnly ? [] : [{ label: "Send reminder", icon: <BellIcon />, onClick: () => sendReminder(s.id, s.practitioner_name) }]}
              />
            </td>
          </tr>
        ))}
        {visible.map((p) => {
          const days = daysLeft(p.expiry_date);
          const isUrgent = days > 0 && days <= 7;
          const ini = initials(p.practitioner_name);
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
              {/* Actions — all under one ⋯ dropdown */}
              <td style={{ ...TD, textAlign: "right" }}>
                <RowActionsInline
                  ariaLabel={`Actions for ${p.session_ref}`}
                  actions={[
                    { label: "View", icon: <ImageIcon />, onClick: () => setViewId(p.id) },
                    { label: downloadBusyId === p.id ? "Downloading…" : "Download", icon: <DownloadIcon />, onClick: () => void downloadSet(p) },
                    ...(SHOW_OFFSPEC_ACTIONS && canGallery
                      ? [{
                          label: galleryBusyId === p.id ? "Working…" : p.featured ? "Remove from gallery" : "Feature in gallery",
                          onClick: () => toggleGallery(p),
                        }]
                      : []),
                    // V5: Delete on every uploaded row (admin-gated, role-edit) — the
                    // mockup applies no status guard, and this tab shows all submissions
                    // as "Uploaded", so gate on admin (!readOnly) only.
                    ...(!readOnly
                      ? [{ label: "Delete", danger: true, onClick: () => remove(p.id) } as RowAction]
                      : []),
                  ]}
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
