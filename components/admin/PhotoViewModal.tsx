"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchJson } from "@/lib/http";
import { downloadPhotoUrls } from "@/lib/download-photos";

interface ViewPayload {
  urls: string[];
  downloadUrls: string[];
  meta: {
    practitioner_ref: string;
    session_ref: string;
    submitted_at: string;
    photo_count: number;
  };
}

// V4 photo popup: a selectable grid — pick photos, then "Download selected"
// (with "Select all"). No moderation here; approve/reject live on the API only.
export function PhotoViewModal({
  id,
  practitionerName,
  onClose,
}: {
  id: string;
  practitionerName: string;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<ViewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchJson<ViewPayload>(`/api/admin/photos/${id}/view`)
      .then((data) => { if (!cancelled) { setPayload(data); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const total = payload?.urls.length ?? 0;
  const allSelected = total > 0 && selected.size === total;

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });

  const selectAll = () =>
    setSelected(allSelected ? new Set() : new Set(Array.from({ length: total }, (_, i) => i)));

  // Download only the selected photos, reporting any the browser refused to save.
  const downloadSelected = useCallback(async () => {
    const dl = payload?.downloadUrls ?? [];
    const urls = [...selected].sort((a, b) => a - b).map((i) => dl[i]).filter(Boolean);
    setDownloading(true);
    setError("");
    const { ok, saved, total, error: err } = await downloadPhotoUrls(urls);
    setDownloading(false);
    if (err) setError(err);
    else if (!ok) setError(`Only ${saved} of ${total} photos downloaded — please retry.`);
  }, [payload, selected]);

  return (
    <div
      onClick={handleOverlayClick}
      style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 860, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(15,17,23,.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              {payload ? `${payload.meta.session_ref} — ${payload.meta.photo_count} photo${payload.meta.photo_count !== 1 ? "s" : ""}` : practitionerName}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
              {payload
                ? `Submitted by ${practitionerName} — select the ones you want to download`
                : "Loading…"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-faint)", display: "flex", borderRadius: 6 }}
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {loading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: "4/3", background: "rgba(15,17,23,.07)", borderRadius: 8 }} />
              ))}
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: 40, color: "#a32d2d", fontSize: 13 }}>{error}</div>
          )}
          {!loading && payload && (
            payload.urls.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {payload.urls.map((url, i) => {
                  const isSel = selected.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggle(i)}
                      aria-pressed={isSel}
                      aria-label={`${isSel ? "Deselect" : "Select"} photo ${i + 1}`}
                      style={{ position: "relative", padding: 0, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: isSel ? "2px solid var(--gold)" : "2px solid rgba(15,17,23,.08)", background: "none", display: "block" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Photo ${i + 1}`}
                        loading="lazy"
                        style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", opacity: isSel ? 0.92 : 1 }}
                      />
                      {/* selection checkbox */}
                      <span
                        aria-hidden="true"
                        style={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? "var(--gold)" : "rgba(255,255,255,.85)", border: isSel ? "none" : "1px solid rgba(15,17,23,.25)", color: "var(--ink)" }}
                      >
                        {isSel && (
                          <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
                No photos to display — storage keys may be missing or expired.
              </div>
            )
          )}
        </div>

        {/* Footer: N selected · Select all · Download selected (V4) */}
        {!loading && payload && payload.urls.length > 0 && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(15,17,23,.10)", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{selected.size} selected</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={selectAll}
                style={{ background: "#fff", color: "var(--ink)", border: "1px solid rgba(15,17,23,.18)", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
              <button
                onClick={downloadSelected}
                disabled={selected.size === 0 || downloading}
                style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: selected.size === 0 || downloading ? "not-allowed" : "pointer", opacity: selected.size === 0 || downloading ? 0.5 : 1, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloading ? "Downloading…" : "Download selected"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
