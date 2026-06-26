"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
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
  statusFilter = "all",
}: {
  initialData: Payout[];
  onRowChange?: (id: string, patch: { status: string; paid_at: string; payment_method: string | null }) => void;
  statusFilter?: string;
}) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{ open: boolean; name?: string; invoice?: string; net?: string; module?: string }>({ open: false });
  const visible = statusFilter === "all" ? data : data.filter((p) => p.status === statusFilter);

  const markPaid = useCallback(async (id: string) => {
    const payment_method = methodMap[id] || "UPI";
    const res = await fetch(`/api/admin/payouts/${id}/mark-paid`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidOn: new Date().toISOString(), payment_method }),
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
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setToast(body.error ?? "Failed to mark payout as paid — please try again.");
      setTimeout(() => setToast(""), 5000);
    }
  }, [methodMap, onRowChange]);

  const pending = data.filter((p) => p.status === "Pending");
  const totalPendingGross = pending.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalPendingNet   = pending.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPendingTds   = totalPendingGross - totalPendingNet;

  const totalGross = visible.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalNet   = visible.reduce((sum, p) => sum + p.net_amount, 0);

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
            {visible.map((p) => {
              const tds = p.gross_amount - p.net_amount;
              const tdsRate = p.tds_rate;
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                  <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{p.invoice_ref}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{p.practitioner?.name ?? "—"}</td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12, fontFamily: "monospace" }}>{p.session?.ref_code}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.session?.module}</div>
                  </td>
                  {/* Gross / TDS / Net 3-line stack */}
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{formatInr(p.gross_amount)}</div>
                    {tds > 0 && (
                      <div style={{ fontSize: 11, color: "#854f0b", marginTop: 1 }}>
                        − TDS {tdsRate ? `${tdsRate}%` : ""} {formatInr(tds)}
                      </div>
                    )}
                    <div style={{ fontWeight: 600, color: tds > 0 ? "var(--ink)" : undefined, fontSize: tds > 0 ? 13 : undefined }}>
                      {tds > 0 && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-faint)", marginRight: 3 }}>net</span>}
                      {formatInr(p.net_amount)}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {p.status === "Pending" ? (
                      <select
                        value={methodMap[p.id] ?? "UPI"}
                        onChange={(e) => setMethodMap((m) => ({ ...m, [p.id]: e.target.value }))}
                        style={{ fontSize: 12, padding: "4px 22px 4px 8px", borderRadius: 6, border: "1px solid rgba(20,18,12,.18)", background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 7px center, #fcfbf8", appearance: "none", WebkitAppearance: "none", color: "#14161d", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{p.payment_method ?? "—"}</span>
                    )}
                  </td>
                  <td style={tdStyle}><StatusPill status={p.status} /></td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {p.status === "Pending" ? (
                        <>
                          <button
                            onClick={() => markPaid(p.id)}
                            style={{ background: "#c9982a", color: "#14161d", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                          >
                            Mark paid
                          </button>
                          <button
                            onClick={() => setDraft({ open: true, name: p.practitioner?.name ?? "", invoice: p.invoice_ref, net: formatInr(p.net_amount), module: p.session?.module ?? "" })}
                            style={{ background: "rgba(20,18,12,.07)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            Draft reminder
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-IN") : "—"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Summary row */}
            {visible.length > 0 && (
              <tr style={{ background: "#f8f7f4", borderTop: "2px solid rgba(20,18,12,.10)" }}>
                <td colSpan={3} style={{ ...tdStyle, fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Total ({visible.length} payout{visible.length > 1 ? "s" : ""})
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500 }}>{formatInr(totalGross)} gross</div>
                  <div style={{ fontWeight: 600 }}>{formatInr(totalNet)} net</div>
                </td>
                <td colSpan={3} style={tdStyle} />
              </tr>
            )}

            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--ink-faint)", fontSize: 13 }}>
                  {data.length === 0 ? "No payouts yet" : "No payouts match the current filter"}
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

      <ContactDraftModal
        open={draft.open}
        onClose={() => setDraft({ open: false })}
        title={`Payout reminder — ${draft.name}`}
        subject={`Payout reminder: ${draft.invoice}`}
        emailBody={`Dear ${draft.name},\n\nThis is a reminder regarding your payout for the ${draft.module} session.\n\nInvoice ref: ${draft.invoice}\nNet payout: ${draft.net}\n\nPlease confirm receipt of this payout or let us know if you have any questions.\n\nWarm regards,\nThe iqcommune Team`}
        waBody={`Hi ${draft.name}! 👋\n\nJust a quick note from the iqcommune team — your payout for the *${draft.module}* session is ready.\n\nInvoice: *${draft.invoice}*\nNet: *${draft.net}*\n\nLet us know if you have any questions!`}
        recipientName={draft.name}
      />
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "var(--ink-faint)", borderBottom: "1px solid rgba(20,18,12,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
