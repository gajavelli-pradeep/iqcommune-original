"use client";

import { useState, useCallback, useEffect, useId, useRef, Fragment } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { PipelineStepper } from "@/components/shared/PipelineStepper";
import type { Database } from "@/lib/supabase/database.types";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { initials } from "@/lib/format";

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
  isSuperAdmin = false,
  onHardDeleted,
}: {
  initialData: Practitioner[];
  onStatusChange?: (id: string, status: string) => void;
  filter?: string;
  onFilterChange?: (f: string) => void;
  isSuperAdmin?: boolean;
  onHardDeleted?: (id: string) => void;
}) {
  const [data, setData] = useState(initialData);

  // Sync when parent adds a new practitioner (e.g. via PractitionerFormModal).
  // useState(initialData) only consumes the initializer once on mount; subsequent
  // prop changes are ignored without this effect.
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [internalFilter, setInternalFilter] = useState<string>("all");
  const filter = filterProp ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [genLink, setGenLink] = useState<{ url: string; refCode: string; practitioner: Practitioner } | null>(null);
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
        setGenLink({ ...body, practitioner: p });
        // API advances status server-side; reflect immediately in local state.
        setData((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "Agreement Sent" } : pr));
        onStatusChange?.(p.id, "Agreement Sent");
      } else {
        showToast("Failed to generate link");
      }
    },
    [showToast, onStatusChange]
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
        setGenLink(null);
        showToast("Agreement link sent via email");
      } else {
        showToast("Email failed — copy link manually");
      }
    },
    [showToast]
  );

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
      <AdminTable
        headers={["Practitioner", "Module", "City", "Applied on", "Rating", "Status", ""]}
        isEmpty={visible.length === 0}
        emptyText="No practitioners in this stage"
      >
        {visible.map((p) => {
              const isExpanded = expandedRow === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    tabIndex={0}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(20,18,12,.07)", cursor: "pointer", background: isExpanded ? "#f8f7f4" : undefined }}
                    onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedRow(isExpanded ? null : p.id);
                      }
                    }}
                  >
                    {/* Practitioner — avatar + name (primary) + role (sub-line) */}
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f5e9c8", color: "#8a6510", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {initials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.role}</div>
                        </div>
                      </div>
                    </td>
                    {/* Module */}
                    <td style={{ ...TD, fontSize: 12, color: "var(--ink-soft)" }}>{(p.modules ?? []).join(", ") || "—"}</td>
                    {/* City */}
                    <td style={TD}>
                      <div>{p.city}</div>
                      {p.state && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.state}</div>}
                    </td>
                    {/* Applied on */}
                    <td style={{ ...TD, fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    {/* Rating */}
                    <td style={{ ...TD, whiteSpace: "nowrap" }}>
                      {p.feedback_count > 0 ? (
                        <div>
                          <span style={{ color: "var(--gold-dark)", fontWeight: 600, fontSize: 13 }}>★</span>
                          <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 3 }}>
                            {Number(p.avg_rating).toFixed(1)}
                          </span>
                          <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
                            {p.feedback_count} session{p.feedback_count !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>—</span>
                      )}
                    </td>
                    <td style={TD}>
                      <StatusPill status={p.status} />
                    </td>
                    {/* Expand chevron */}
                    <td style={{ ...TD, width: 32, textAlign: "center", color: "var(--ink-faint)" }}>
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        style={{
                          transition: "transform .2s",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      >
                        <path d="M2 4.5L7 9.5L12 4.5" />
                      </svg>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                      <td colSpan={6} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                        <div style={{ border: "1px solid rgba(20,18,12,.10)", borderRadius: 8, background: "#fff", padding: "1rem 1.25rem", borderTop: "2px solid #c9982a" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "2rem" }}>
                            {/* Col 1: Profile details */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Profile</div>
                              {[
                                ["Ref", p.ref_code ? `IQC-EMP-${p.ref_code}` : "—"],
                                ["Email", p.email],
                                ["Phone", p.phone ?? "—"],
                                ["Role", p.role],
                                ["Org", p.org ?? "Independent"],
                                ["City", `${p.city}${p.state ? `, ${p.state}` : ""}`],
                                ["Experience", p.experience ?? "—"],
                                ["Modules", (p.modules ?? []).join(", ") || "—"],
                                ["Availability", p.teach_freq ?? "—"],
                              ].map(([label, value]) => (
                                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: "0.45rem" }}>
                                  <span style={{ color: "var(--ink-faint)", width: 90, flexShrink: 0, fontSize: 12 }}>{label}</span>
                                  <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{value}</span>
                                </div>
                              ))}
                              {p.why && (
                                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(20,18,12,.07)" }}>
                                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 4 }}>Why teach</div>
                                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{p.why}</div>
                                </div>
                              )}
                            </div>

                            {/* Col 2: Pipeline progress */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Pipeline Progress</div>
                              <PipelineStepper
                                status={p.status}
                                timestamps={{ Applied: p.created_at ?? undefined }}
                              />
                            </div>

                            {/* Col 3: Actions */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Update Status</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                <select
                                  value={p.status}
                                  onChange={(e) => { e.stopPropagation(); updateStatus(p.id, e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", fontFamily: "inherit", fontSize: 13, color: "var(--ink)", background: "#f8f7f4", outline: "none", cursor: "pointer" }}
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>

                                {/* Message + Notes */}
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(
                                        `mailto:${p.email}?subject=${encodeURIComponent(`iqcommune — ${p.name}`)}`
                                      );
                                    }}
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f8f7f4", border: "1px solid rgba(20,18,12,.15)", borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Message
                                  </button>
                                  <button
                                    disabled
                                    title="Coming soon"
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f8f7f4", border: "1px solid rgba(20,18,12,.10)", borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "not-allowed", fontFamily: "inherit", color: "var(--ink-faint)", opacity: 0.6 }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Notes
                                  </button>
                                </div>

                                {p.status === "Screening Done" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; generateLink(p); }}
                                    style={{ background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Generate agreement link
                                  </button>
                                )}

                                {(p.upi_id || p.bank_account) && (
                                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(20,18,12,.08)" }}>
                                    <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>Payment details</div>
                                    {[["UPI", p.upi_id], ["Bank", p.bank_name], ["Account", p.bank_account], ["IFSC", p.ifsc]].filter(([, v]) => v).map(([label, value]) => (
                                      <div key={String(label)} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12 }}>
                                        <span style={{ color: "var(--ink-faint)", minWidth: 60 }}>{label}</span>
                                        <span style={{ fontFamily: "monospace", fontWeight: 500 }}>{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {isSuperAdmin && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #fca5a5" }}>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`Delete ${p.name} permanently? This cannot be undone.`)) return;
                                        const res = await fetch(`/api/admin/super/practitioners/${p.id}`, { method: "DELETE" });
                                        if (res.ok) {
                                          setData((prev) => prev.filter((pr) => pr.id !== p.id));
                                          onHardDeleted?.(p.id);
                                          setExpandedRow(null);
                                        } else {
                                          showToast("Delete failed — please try again.");
                                        }
                                      }}
                                      style={{ width: "100%", background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                    >
                                      Delete practitioner permanently
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
      </AdminTable>

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
            <button
              onClick={() => sendAgreementEmail(genLink.practitioner, genLink.url)}
              style={btnStyle("#c9982a", "#14161d")}
            >
              Send via email
            </button>
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
