"use client";

import { useState, useCallback } from "react";
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

export function PractitionerTable({ initialData }: { initialData: Practitioner[] }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Practitioner | null>(null);
  const [genLink, setGenLink] = useState<{ url: string; refCode: string } | null>(null);
  const [toast, setToast] = useState("");

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
        showToast(`Status updated to "${status}"`);
      } else {
        showToast("Failed to update status");
      }
    },
    [showToast]
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
        // Only advance status after email is confirmed sent
        await updateStatus(p.id, "Agreement Sent");
        setGenLink(null);
        showToast("Agreement link sent via email");
      } else {
        showToast("Email failed — copy link manually");
      }
    },
    [updateStatus, showToast]
  );

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
        <button
          onClick={() => setFilter("all")}
          style={chipStyle(filter === "all")}
        >
          All ({data.length})
        </button>
        {PIPELINE_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={chipStyle(filter === s)}
          >
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
              {["Ref", "Name", "Role / Org", "City", "Modules", "Status", "Actions"].map(
                (h) => (
                  <th key={h} style={thStyle}>{h}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={p.id}
                style={{ borderBottom: "1px solid rgba(15,17,23,.07)", cursor: "pointer" }}
                onClick={() => setSelected(p)}
              >
                <td style={tdStyle}>{p.ref_code ? `#${p.ref_code}` : "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{p.name}</td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 13 }}>{p.role}</div>
                  {p.org && (
                    <div style={{ fontSize: 11, color: "#9496a1" }}>{p.org}</div>
                  )}
                </td>
                <td style={tdStyle}>{p.city}</td>
                <td style={tdStyle}>{p.modules.join(", ")}</td>
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
                        onClick={() => generateLink(p)}
                        style={btnStyle("#c9982a", "#fff")}
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
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9496a1", fontSize: 13 }}>
                  No practitioners in this stage
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generated link modal */}
      {genLink && (
        <Modal onClose={() => setGenLink(null)} title="Agreement link generated">
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Copy this link and send manually, or click &ldquo;Send via email&rdquo; to deliver automatically.
          </p>
          <div style={{ background: "#f8f7f4", border: "1px solid rgba(15,17,23,.1)", borderRadius: 8, padding: "10px 12px", fontSize: 12, wordBreak: "break-all", marginBottom: 16, color: "#0f1117", fontFamily: "monospace" }}>
            {genLink.url}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(genLink.url); showToast("Copied!"); }}
              style={btnStyle("rgba(15,17,23,.07)", "#0f1117")}
            >
              Copy link
            </button>
            {selected && (
              <button
                onClick={() => sendAgreementEmail(selected, genLink.url)}
                style={btnStyle("#c9982a", "#fff")}
              >
                Send via email
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Detail drawer */}
      {selected && (
        <Modal onClose={() => setSelected(null)} title={selected.name}>
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
                <span style={{ color: "#9496a1", minWidth: 100 }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            {selected.why && (
              <div>
                <div style={{ color: "#9496a1", marginBottom: 4 }}>Why teach</div>
                <div style={{ lineHeight: 1.6 }}>{selected.why}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f1117", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#9496a1" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "#9496a1", borderBottom: "1px solid rgba(15,17,23,.1)", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const selectStyle: React.CSSProperties = { fontSize: 12, padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(15,17,23,.15)", background: "#fff", cursor: "pointer", fontFamily: "inherit" };

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };
}

function chipStyle(active: boolean, red = false): React.CSSProperties {
  return {
    padding: "5px 14px",
    borderRadius: 100,
    border: active ? "1px solid #0f1117" : "1px solid rgba(15,17,23,.12)",
    background: active ? "#0f1117" : "#fff",
    color: active ? "#fff" : red ? "#a32d2d" : "#4a4d5c",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
