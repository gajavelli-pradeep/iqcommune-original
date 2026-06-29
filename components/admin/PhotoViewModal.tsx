"use client";

import { useEffect, useState, useCallback } from "react";

interface ViewPayload {
  urls: string[];
  meta: {
    practitioner_ref: string;
    session_ref: string;
    submitted_at: string;
    photo_count: number;
  };
}

export function PhotoViewModal({
  id,
  practitionerName,
  status,
  onClose,
  onApprove,
  onDelete,
}: {
  id: string;
  practitionerName: string;
  status: string;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [payload, setPayload] = useState<ViewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/photos/${id}/view`)
      .then((r) => {
        if (!r.ok) return r.json().then((b: { error?: string }) => { throw new Error(b.error ?? "Failed to load photos"); });
        return r.json() as Promise<ViewPayload>;
      })
      .then((data) => { setPayload(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
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

  return (
    <div
      onClick={handleOverlayClick}
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 860, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(20,18,12,.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{practitionerName}</div>
            {payload && (
              <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2, fontFamily: "monospace" }}>
                {payload.meta.session_ref} · {payload.meta.photo_count} photo{payload.meta.photo_count !== 1 ? "s" : ""} · submitted {new Date(payload.meta.submitted_at).toLocaleDateString("en-IN")}
              </div>
            )}
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
                <div
                  key={i}
                  style={{ aspectRatio: "4/3", background: "rgba(20,18,12,.07)", borderRadius: 8 }}
                />
              ))}
            </div>
          )}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: 40, color: "#a32d2d", fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && payload && (
            payload.urls.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {payload.urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(20,18,12,.08)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      loading="lazy"
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
                No photos to display — storage keys may be missing or expired.
              </div>
            )
          )}
        </div>

        {/* Footer actions */}
        {(onApprove || onDelete) && (
          <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(20,18,12,.10)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
            {onDelete && (
              <button
                onClick={() => { onDelete(id); onClose(); }}
                style={{ background: "rgba(20,18,12,.07)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                Delete
              </button>
            )}
            {status === "Pending" && onApprove && (
              <button
                onClick={() => { onApprove(id); onClose(); }}
                style={{ background: "#c9982a", color: "#14161d", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Approve
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
