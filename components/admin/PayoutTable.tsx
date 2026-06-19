"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatInr } from "@/lib/tds";

interface Payout {
  id: string;
  invoice_ref: string;
  gross_amount: number;
  net_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  status: string;
  tds_rate?: number | null;
  session: { ref_code: string; module: string } | null;
  practitioner: { name: string } | null;
}

const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;

export function PayoutTable({
  initialData,
  onRowChange,
}: {
  initialData: Payout[];
  onRowChange?: (id: string, patch: { status: string; paid_at: string; payment_method: string | null }) => void;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});

  const markPaid = useCallback(async (id: string) => {
    const payment_method = methodMap[id] || "UPI";
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_method }),
    });
    if (res.ok) {
      const paid_at = new Date().toISOString();
      setData((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "Paid", paid_at, payment_method } : p
        )
      );
      onRowChange?.(id, { status: "Paid", paid_at, payment_method });
      setToast("Payout marked as paid");
      setTimeout(() => setToast(""), 3000);
    }
  }, [methodMap, onRowChange]);

  const pending = data.filter((p) => p.status === "Pending");
  const totalPendingGross = pending.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalPendingNet   = pending.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPendingTds   = totalPendingGross - totalPendingNet;

  const totalGross = data.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalNet   = data.reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ background: "#faeeda", border: "1px solid #fac775", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
          <strong>{pending.length} pending payout{pending.length > 1 ? "s" : ""}</strong>
          {" — "}gross: {formatInr(totalPendingGross)}
          {totalPendingTds > 0 && (
            <span style={{ color: "#854f0b" }}> · TDS: {formatInr(totalPendingTds)}</span>
          )}
          {" · "}net: <strong>{formatInr(totalPendingNet)}</strong>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Invoice", "Practitioner", "Session", "Gross / TDS / Net", "Method", "Status", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => {
              const tds = p.gross_amount - p.net_amount;
              const tdsRate = p.tds_rate;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
                  <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{p.invoice_ref}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{p.practitioner?.name ?? "—"}</td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12, fontFamily: "monospace" }}>{p.session?.ref_code}</div>
                    <div style={{ fontSize: 11, color: "#9496a1" }}>{p.session?.module}</div>
                  </td>
                  {/* Gross / TDS / Net 3-line stack */}
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{formatInr(p.gross_amount)}</div>
                    {tds > 0 && (
                      <div style={{ fontSize: 11, color: "#854f0b", marginTop: 1 }}>
                        − TDS {tdsRate ? `${tdsRate}%` : ""} {formatInr(tds)}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, color: tds > 0 ? "#0f1117" : undefined, fontSize: tds > 0 ? 13 : undefined }}>
                      {tds > 0 && <span style={{ fontSize: 10, fontWeight: 400, color: "#9496a1", marginRight: 3 }}>net</span>}
                      {formatInr(p.net_amount)}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {p.status === "Pending" ? (
                      <select
                        value={methodMap[p.id] ?? "UPI"}
                        onChange={(e) => setMethodMap((m) => ({ ...m, [p.id]: e.target.value }))}
                        style={{ fontSize: 12, padding: "3px 6px", borderRadius: 6, border: "1px solid rgba(15,17,23,.15)", background: "#fff", fontFamily: "inherit" }}
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: "#4a4d5c" }}>{p.payment_method ?? "—"}</span>
                    )}
                  </td>
                  <td style={tdStyle}><StatusPill status={p.status} /></td>
                  <td style={tdStyle}>
                    {p.status === "Pending" ? (
                      <button
                        onClick={() => markPaid(p.id)}
                        style={{ background: "#c9982a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                      >
                        Mark paid
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "#9496a1" }}>
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN") : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Summary row */}
            {data.length > 0 && (
              <tr style={{ background: "#f8f7f4", borderTop: "2px solid rgba(15,17,23,.10)" }}>
                <td colSpan={3} style={{ ...tdStyle, fontSize: 11, fontWeight: 600, color: "#9496a1", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total ({data.length} payouts)
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500 }}>{formatInr(totalGross)} gross</div>
                  <div style={{ fontWeight: 600 }}>{formatInr(totalNet)} net</div>
                </td>
                <td colSpan={3} style={tdStyle} />
              </tr>
            )}

            {data.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9496a1", fontSize: 13 }}>
                  No payouts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f1117", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "#9496a1", borderBottom: "1px solid rgba(15,17,23,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
