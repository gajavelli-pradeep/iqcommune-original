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
  session: { ref_code: string; module: string } | null;
  practitioner: { name: string } | null;
}

export function PayoutTable({ initialData }: { initialData: Payout[] }) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");

  const markPaid = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/payouts/${id}`, { method: "PATCH" });
    if (res.ok) {
      setData((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "Paid", paid_at: new Date().toISOString() } : p
        )
      );
      setToast("Payout marked as paid");
      setTimeout(() => setToast(""), 3000);
    }
  }, []);

  const pending = data.filter((p) => p.status === "Pending");
  const totalPending = pending.reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <div>
      {pending.length > 0 && (
        <div style={{ background: "#faeeda", border: "1px solid #fac775", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
          <strong>{pending.length} pending payout{pending.length > 1 ? "s" : ""}</strong> — total net: {formatInr(totalPending)}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Invoice", "Practitioner", "Session", "Gross", "Net", "Status", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
                <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{p.invoice_ref}</span></td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{p.practitioner?.name ?? "—"}</td>
                <td style={tdStyle}>
                  <div style={{ fontSize: 12, fontFamily: "monospace" }}>{p.session?.ref_code}</div>
                  <div style={{ fontSize: 11, color: "#9496a1" }}>{p.session?.module}</div>
                </td>
                <td style={tdStyle}>{formatInr(p.gross_amount)}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{formatInr(p.net_amount)}</td>
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
            ))}
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
