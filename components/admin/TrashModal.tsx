"use client";

import { useState, useEffect, useCallback } from "react";

interface TrashItem {
  table: string;
  kind: string;
  id: string;
  label: string;
  sublabel: string;
  deleted_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TrashModal({ open, onClose }: Props) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [error, setError] = useState("");

  const flash = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // setState only fires inside the promise callbacks — no set-state-in-effect.
  const load = useCallback(() => {
    fetch("/api/admin/global/trash")
      .then((r) => r.json())
      .then((j) => {
        if (j.items) setItems(j.items);
        else setError("Failed to load trash.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  // Conditionally mounted (see AdminConsoleView) → fresh state each open.
  useEffect(() => { load(); }, [load]);

  async function act(item: TrashItem, method: "POST" | "DELETE") {
    setBusyId(item.id);
    setError("");
    try {
      const res = await fetch("/api/admin/global/trash", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: item.table, id: item.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Action failed.");
      } else {
        flash(method === "POST" ? `${item.kind} restored.` : `${item.kind} permanently deleted.`, true);
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
      setConfirmPurgeId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,22,29,.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--surface)", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,.18)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(15,17,23,.1)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Trash</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
              Deleted records — restore within 30 days before they’re permanently purged
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 6, borderRadius: 6, display: "flex" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 22px 22px", overflowY: "auto" }}>
          {toast && (
            <div style={{ background: toast.ok ? "var(--green-light)" : "var(--red-light)", border: `1px solid ${toast.ok ? "var(--green-border)" : "var(--red-border)"}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: toast.ok ? "var(--green)" : "var(--red)", marginBottom: 14 }}>
              {toast.msg}
            </div>
          )}
          {error && (
            <div style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: "var(--ink-faint)", fontSize: 13, padding: "12px 0" }}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={{ color: "var(--ink-faint)", fontSize: 13, padding: "12px 0" }}>Trash is empty.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => {
                const busy = busyId === it.id;
                return (
                  <div key={`${it.table}-${it.id}`} style={{ border: "1px solid rgba(15,17,23,.1)", borderRadius: 10, padding: "12px 14px", background: "var(--surface-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-faint)", background: "var(--surface-sunken)", border: "1px solid rgba(15,17,23,.1)", borderRadius: 100, padding: "1px 8px" }}>
                            {it.kind}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>
                          {it.sublabel ? `${it.sublabel} · ` : ""}deleted {new Date(it.deleted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => act(it, "POST")} disabled={busy} style={{ ...smallBtn, opacity: busy ? 0.6 : 1 }}>
                          {busy ? "…" : "Restore"}
                        </button>
                        {confirmPurgeId === it.id ? (
                          <button onClick={() => act(it, "DELETE")} disabled={busy} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)", opacity: busy ? 0.6 : 1 }}>
                            {busy ? "…" : "Confirm"}
                          </button>
                        ) : (
                          <button onClick={() => setConfirmPurgeId(it.id)} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)" }}>
                            Delete forever
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 12px",
  border: "1px solid rgba(15,17,23,.18)",
  borderRadius: 6,
  background: "var(--surface)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  color: "var(--ink)",
};
