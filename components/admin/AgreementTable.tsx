"use client";

import { useState, useRef } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import type { Database } from "@/lib/supabase/database.types";
import { useUndoToast } from "@/components/admin/useUndoToast";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { initials } from "@/lib/format";

// Op-procedure alignment (branch v5/opproc-alignment): the doc's Agreements flow
// needs manual controls — set signed-date/method (P7/P8) and Delete-to-redo (E2).
// This flag (gates only the Global-Admin Edit + Delete row actions) is ON here; it
// stays OFF on the mockup-match branch. See ADMIN-V5-SPECDIFF.md / V5-OPPROC-*.md.
const SHOW_OFFSPEC_ACTIONS = true;

// Agreements row joined with practitioner name + role
type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];

export type Agreement = AgreementRow & {
  practitioner_name: string;
  practitioner_role: string;
  // Gap 24: Timestamp column — separate precision datetime string
  practitioner_ini?: string;
};

export function AgreementTable({
  initialData,
  isGlobalAdmin = false,
  onHardDeleted,
  onEdit,
  onUploaded,
}: {
  initialData: Agreement[];
  isGlobalAdmin?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
  onUploaded?: (id: string, patch: Partial<Agreement>) => void;
}) {
  const [toast, setToast] = useState("");
  const undo = useUndoToast();

  // Op-procedure Part 2 step 7: upload the signed copy via a hidden file picker.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadId = useRef<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function chooseSignedCopy(id: string) {
    pendingUploadId.current = id;
    fileInputRef.current?.click();
  }

  async function onSignedCopyPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = pendingUploadId.current;
    e.target.value = ""; // allow re-picking the same file
    if (!file || !id) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/agreements/${id}/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(j.error ?? "Upload failed");
        return;
      }
      const { data } = (await res.json()) as { data: Partial<Agreement> };
      onUploaded?.(id, {
        storage_path: data.storage_path,
        status: data.status,
        signed_at: data.signed_at,
        signature_method: data.signature_method,
      });
      showToast("Signed copy uploaded");
    } catch {
      showToast("Upload failed — please try again.");
    } finally {
      setUploadingId(null);
    }
  }

  // V5 act-then-undo: delete (soft) then offer ~9s to Undo (restore via trash).
  async function deleteAgreementWithUndo(id: string, label: string) {
    const res = await fetch(`/api/admin/global/agreements/${id}`, { method: "DELETE" });
    if (!res.ok) { showToast("Delete failed — please try again."); return; }
    onHardDeleted?.(id);
    undo.show(`Agreement for ${label} deleted`, async () => {
      await fetch("/api/admin/global/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "agreements", id }),
      });
    });
  }

  const [filter, setFilter] = useState("All");
  const df = useDateFilter(initialData.map((a) => a.signed_at));
  const visible = (filter === "All" ? initialData : initialData.filter((a) => a.status === filter))
    .filter((a) => df.matchesDate(a.signed_at));
  const pendingCount = initialData.filter((a) => a.status === "Pending signature" && df.matchesDate(a.signed_at)).length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  async function handleDownload(id: string) {
    const res = await fetch(`/api/admin/agreements/${id}/download`);
    if (!res.ok) { showToast("Download failed"); return; }
    const { url } = await res.json();
    window.open(url, "_blank");
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={onSignedCopyPicked} />
      <PendingBar
        pendingCards={[{
          count: pendingCount,
          label: "Awaiting signature",
          active: filter === "Pending signature",
          onToggle: () => setFilter(filter === "Pending signature" ? "All" : "Pending signature"),
        }]}
        dateFilter={df.control}
        dateLabel="Signed in:"
      />

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
            border: "1px solid rgba(20,18,12,.10)",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              {/* Gap 24: 8 columns matching source exactly — 'Agreement ref.' lowercase r with period, 'Signed on' lowercase o, + 'Timestamp' */}
              {[
                "Practitioner",
                "Agreement ref.",
                "Module",
                "Signed on",
                "Timestamp",
                "Method",
                "Status",
                "Actions",
              ].map((h) => (
                <th key={h} scope="col" style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}
              >
                {/* Gap 37: avatar circle (gold-l bg, gold-d text) + name only (no role) */}
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        background: "#f5e9c8",
                        color: "#8a6510",
                      }}
                    >
                      {row.practitioner_ini ??
                        (row.practitioner_name
                          ? initials(row.practitioner_name, { uppercase: false, compact: true }) || "??"
                          : "??"
                        )
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                        {row.practitioner_name}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Gap 38: ref color ink-m (var(--ink-soft)), not gold-d */}
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {row.ref_code ? `IQC-EMP-${row.ref_code.replace(/^IQC-EMP-/, "")}` : "—"}
                  </span>
                </td>

                {/* Module */}
                <td style={{ ...tdStyle, fontSize: 13, color: "var(--ink-soft)" }}>
                  {row.module}
                </td>

                {/* Gap 39: 'Signed on' — format as '12 Jun 2025' */}
                <td
                  style={{
                    ...tdStyle,
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.signed_at
                    ? new Date(row.signed_at).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>

                {/* Gap 24: Timestamp column — precise datetime in monospace */}
                <td
                  style={{
                    ...tdStyle,
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "var(--ink-faint)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {/* Use signed_at with time component if available, else '—' */}
                  {row.signed_at
                    ? new Date(row.signed_at).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })
                    : "Pending"}
                </td>

                {/* Gap 25: Method as full plain text, not styled badge */}
                <td style={tdStyle}>
                  <MethodCell method={row.signature_method} />
                </td>

                {/* Status pill */}
                <td style={tdStyle}>
                  <StatusPill status={row.status ?? "pending"} />
                </td>

                {/* Gap 26: Download button with 'Download' text label */}
                <td style={tdStyle}>
                  <button
                    aria-label="Download agreement"
                    disabled={!row.storage_path}
                    title={!row.storage_path ? "No file available yet" : undefined}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 100,
                      border: "1px solid rgba(20,18,12,.18)",
                      color: row.storage_path ? "var(--ink-soft)" : "var(--ink-faint)",
                      background: "#fff",
                      cursor: row.storage_path ? "pointer" : "not-allowed",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: "inherit",
                      fontWeight: 500,
                      opacity: row.storage_path ? 1 : 0.5,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(row.id);
                    }}
                  >
                    <svg
                      width={11}
                      height={11}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </button>
                  {/* Op-procedure Part 2 step 7 + P9: upload the signed copy; the
                      button disappears once a file exists, so you can't re-upload
                      over a real record (use Delete/Edit to redo). */}
                  {isGlobalAdmin && !row.storage_path && (
                    <button
                      onClick={(e) => { e.stopPropagation(); chooseSignedCopy(row.id); }}
                      disabled={uploadingId === row.id}
                      title={`Upload signed copy for ${row.practitioner_name}`}
                      style={{ marginLeft: 6, background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 100, padding: "3px 10px", cursor: uploadingId === row.id ? "default" : "pointer", color: "var(--ink-soft)", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 500 }}
                    >
                      <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {uploadingId === row.id ? "Uploading…" : "Upload signed copy"}
                    </button>
                  )}
                  {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(row.id); }}
                      style={{ marginLeft: 6, background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 100, padding: "3px 8px", cursor: "pointer", color: "var(--ink-soft)", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
                      title={`Edit agreement for ${row.practitioner_name}`}
                    >
                      <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                  )}
                  {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAgreementWithUndo(row.id, row.practitioner_name); }}
                      style={{ marginLeft: 6, background: "none", border: "1px solid #fca5a5", borderRadius: 100, padding: "3px 8px", cursor: "pointer", color: "#991b1b", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, transition: "background .12s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      title={`Delete agreement for ${row.practitioner_name}`}
                    >
                      <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--ink-faint)",
                    fontSize: 13,
                  }}
                >
                  {initialData.length === 0 ? "No agreements found" : "No agreements match the current filter"}
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
      {undo.node}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Gap 25: render full method string as plain text (no styled badge)
function MethodCell({ method }: { method: string | null }) {
  if (!method || method === "—") {
    return <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>—</span>;
  }
  return <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{method}</span>;
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.7rem 1.25rem",
  background: "#f8f7f4",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
  borderBottom: "1px solid rgba(20,18,12,.10)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.85rem 1.25rem",
  verticalAlign: "middle",
  fontSize: 13,
};
