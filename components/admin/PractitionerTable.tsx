"use client";

import { useState, useCallback, useEffect, useId, useRef } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import type { Database } from "@/lib/supabase/database.types";

type Practitioner = Database["public"]["Tables"]["practitioners"]["Row"];

const STATUSES = [
  "Applied",
  "Under Review",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
  "Rejected",
] as const;

const PIPELINE_ORDER = STATUSES.filter((s) => s !== "Rejected");

export function PractitionerTable({
  initialData,
  onStatusChange,
  filter: filterProp,
  onFilterChange,
}: {
  initialData: Practitioner[];
  onStatusChange?: (id: string, status: string) => void;
  filter?: string;
  onFilterChange?: (f: string) => void;
}) {
  const [data, setData] = useState(initialData);
  const [internalFilter, setInternalFilter] = useState<string>("all");
  const filter = filterProp ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const [selected, setSelected] = useState<Practitioner | null>(null);
  const [genLink, setGenLink] = useState<{ url: string; refCode: string } | null>(null);
  const [toast, setToast] = useState("");
  // Track which row triggered a modal so focus can be restored on close
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: string) => {
      const res = await fetch(`/api/admin/practitioners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setData((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p))
        );
        onStatusChange?.(id, status);
        showToast(`Status updated to "${status}"`);
      } else {
        showToast("Failed to update status");
      }
    },
    [showToast, onStatusChange]
  );

  const generateLink = useCallback(
    async (p: Practitioner) => {
      const res = await fetch("/api/admin/onboarding-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: p.id }),
      });
      if (res.ok) {
        const body = await res.json();
        setGenLink(body);
      } else {
        showToast("Failed to generate link");
      }
    },
    [showToast]
  );

  const sendAgreementEmail = useCallback(
    async (p: Practitioner, url: string) => {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "agreement-link",
          to: p.email,
          name: p.name,
          onboardingUrl: url,
        }),
      });
      if (res.ok) {
        await updateStatus(p.id, "Agreement Sent");
        setGenLink(null);
        showToast("Agreement link sent via email");
      } else {
        showToast("Email failed — copy link manually");
      }
    },
    [updateStatus, showToast]
  );

  function openDetail(p: Practitioner, trigger: HTMLElement) {
    lastFocusRef.current = trigger;
    setSelected(p);
  }

  function closeDetail() {
    setSelected(null);
    setTimeout(() => (lastFocusRef.current as HTMLElement | null)?.focus(), 0);
  }

  function closeGenLink() {
    setGenLink(null);
    setTimeout(() => (lastFocusRef.current as HTMLElement | null)?.focus(), 0);
  }

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: data.filter((p) => p.status === s).length }),
    {} as Record<string, number>
  );

  const visible =
    filter === "all" ? data : data.filter((p) => p.status === filter);

  return (
    <div>
      {/* Pipeline chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button onClick={() => setFilter("all")} style={chipStyle(filter === "all")}>
          All ({data.length})
        </button>
        {PIPELINE_ORDER.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={chipStyle(filter === s)}>
            {s} ({counts[s] ?? 0})
          </button>
        ))}
        <button
          onClick={() => setFilter("Rejected")}
          style={chipStyle(filter === "Rejected", true)}
        >
          Rejected ({counts.Rejected ?? 0})
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Ref", "Name", "Role / Org", "City", "Modules", "Applied", "Status", "Actions"].map(
                (h) => (
                  <th key={h} scope="col" style={thStyle}>{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                tabIndex={0}
                style={{ borderBottom: "1px solid rgba(20,18,12,.07)", cursor: "pointer" }}
                onClick={(e) => openDetail(p, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDetail(p, e.currentTarget);
                  }
                }}
              >
                <td style={tdStyle}>{p.ref_code ? `#${p.ref_code}` : "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{p.name}</td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13 }}>{p.role}</div>
                  {p.org && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.org}</div>
                  )}
                </td>
                <td style={tdStyle}>{p.city}</td>
                <td style={tdStyle}>{p.modules.join(", ")}</td>
                <td style={{ ...tdStyle, fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                </td>
                <td style={tdStyle}>
                  <StatusPill status={p.status} />
                </td>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                      style={selectStyle}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {p.status === "Screening Done" && (
                      <button
                        onClick={(e) => { lastFocusRef.current = e.currentTarget; generateLink(p); }}
                        style={btnStyle("#c9982a", "#14161d")}
                      >
                        Gen. link
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)", fontSize: 13 }}>
                  No practitioners in this stage
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generated link modal */}
      {genLink && (
        <Modal onClose={closeGenLink} title="Agreement link generated">
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Copy this link and send manually, or click &ldquo;Send via email&rdquo; to deliver automatically.
          </p>
          <div style={{ background: "#f8f7f4", border: "1px solid rgba(20,18,12,.1)", borderRadius: 8, padding: "10px 12px", fontSize: 12, wordBreak: "break-all", marginBottom: 16, color: "var(--ink)", fontFamily: "monospace" }}>
            {genLink.url}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(genLink.url);
                  showToast("Copied!");
                } catch {
                  showToast("Copy failed — select and copy manually");
                }
              }}
              style={btnStyle("rgba(20,18,12,.07)", "var(--ink)")}
            >
              Copy link
            </button>
            {selected && (
              <button
                onClick={() => sendAgreementEmail(selected, genLink.url)}
                style={btnStyle("#c9982a", "#14161d")}
              >
                Send via email
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Detail drawer */}
      {selected && (
        <Modal onClose={closeDetail} title={selected.name}>
          <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
            {[
              ["Email", selected.email],
              ["Phone", selected.phone ?? "—"],
              ["Role", selected.role],
              ["Org", selected.org ?? "Independent"],
              ["City", selected.city],
              ["Experience", selected.experience],
              ["Modules", selected.modules.join(", ")],
              ["Availability", selected.teach_freq ?? "—"],
              ["Status", selected.status],
              ["Ref", selected.ref_code ? `IQC-EMP-${selected.ref_code}` : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--ink-faint)", minWidth: 100 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            {selected.why && (
              <div>
                <div style={{ color: "var(--ink-faint)", marginBottom: 4 }}>Why teach</div>
                <div style={{ lineHeight: 1.6 }}>{selected.why}</div>
              </div>
            )}
            {/* Consent flags */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(20,18,12,.08)" }}>
              <div style={{ color: "var(--ink-faint)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Consents</div>
              {[
                ["Operational", selected.consent_operational],
                ["No-sell", selected.consent_nosell],
                ["Employer", selected.consent_employer],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: "flex", gap: 12, marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-faint)", minWidth: 100 }}>{label}</span>
                  <span style={{ color: val ? "#2a6b2a" : "#a32d2d", fontWeight: 500 }}>{val ? "✓ Yes" : "✗ No"}</span>
                </div>
              ))}
            </div>
            {/* Payment info */}
            {(selected.upi_id || selected.bank_account) && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(20,18,12,.08)" }}>
                <div style={{ color: "var(--ink-faint)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Payment details</div>
                {[
                  ["UPI", selected.upi_id],
                  ["Bank", selected.bank_name],
                  ["Account", selected.bank_account],
                  ["IFSC", selected.ifsc],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={String(label)} style={{ display: "flex", gap: 12, marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: "var(--ink-faint)", minWidth: 100 }}>{label}</span>
                    <span style={{ fontWeight: 500, fontFamily: "monospace", fontSize: 12 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Persistent aria-live region — must stay in DOM even when empty so announcements fire reliably */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: toast ? "var(--ink)" : "transparent",
          color: "#fff",
          padding: toast ? "10px 18px" : 0,
          borderRadius: 8,
          fontSize: 13,
          zIndex: 9999,
          transition: "background .15s",
          pointerEvents: "none",
        }}
      >
        {toast}
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus first focusable element on open
  useEffect(() => {
    const el = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href]'
    );
    el?.focus();
  }, []);

  // Close on Escape; trap Tab within dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 id={titleId} style={{ fontWeight: 600, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--ink-faint)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "var(--ink-faint)", borderBottom: "1px solid rgba(20,18,12,.1)", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const CHEVRON_GOLD = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const selectStyle: React.CSSProperties = { fontSize: 12, padding: "5px 22px 5px 8px", borderRadius: 6, border: "1px solid rgba(20,18,12,.18)", background: `${CHEVRON_GOLD} no-repeat right 7px center, #fcfbf8`, appearance: "none", WebkitAppearance: "none", color: "#14161d", cursor: "pointer", fontFamily: "inherit" };

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };
}

function chipStyle(active: boolean, red = false): React.CSSProperties {
  return {
    padding: "5px 14px",
    borderRadius: 100,
    border: active ? "1px solid var(--ink)" : "1px solid rgba(20,18,12,.12)",
    background: active ? "var(--ink)" : "#fff",
    color: active ? "#fff" : red ? "#a32d2d" : "var(--ink-soft)",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
