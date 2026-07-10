"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { TableFilterBar } from "@/components/admin/TableFilterBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { matchesSearch } from "@/lib/admin/search";
import { initials } from "@/lib/format";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const PAYOUT_FILTERS = ["All", "Pending", "Paid"] as const;

interface Payout {
  id: string;
  invoice_ref: string;
  gross_amount: number;
  net_amount: number;
  payment_method: string | null;
  paid_at: string | null;
  status: string;
  tds_rate?: number | null;
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: {
    name: string;
    upi_id: string | null;
    bank_account: string | null;
    bank_name: string | null;
  } | null;
}

const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;

const HEADERS = [
  "Practitioner",
  "Session",
  "Session date",
  "Payout (₹)",
  "Pay to",
  "Method",
  "Invoice ref.",
  "Payment status",
  "Action",
];

function fmtSessionDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function payToDetail(p: Payout): string {
  if (p.practitioner?.upi_id) return p.practitioner.upi_id;
  if (p.practitioner?.bank_account && p.practitioner?.bank_name)
    return `${p.practitioner.bank_name} ···${p.practitioner.bank_account.slice(-4)}`;
  return "";
}

function paidMethodLabel(p: Payout): string {
  const method = p.payment_method ?? "—";
  const upi = p.practitioner?.upi_id;
  const bank = p.practitioner?.bank_account;
  const bankName = p.practitioner?.bank_name;
  if (upi && (method === "UPI" || method === "IMPS")) return `${method} — ${upi}`;
  if (bank) return `${method} — ${bankName ? `${bankName} ` : ""}···${bank.slice(-4)}`;
  return method;
}

function fmtPaidAt(d: string | null): string {
  if (!d) return "Paid";
  return `Paid — ${new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export function PayoutTable({
  initialData,
  onRowChange,
  isGlobalAdmin = false,
  readOnly = false,
  onHardDeleted,
  onEdit,
}: {
  initialData: Payout[];
  onRowChange?: (id: string, patch: { status: string; paid_at: string; payment_method: string | null }) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  // Reflect parent-driven updates (e.g. a global-admin edit) without an effect.
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) { setPrevInitial(initialData); setData(initialData); }
  const [toast, setToast] = useState("");
  const [methodMap, setMethodMap] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const [draft, setDraft] = useState<{
    open: boolean;
    name?: string;
    invoice?: string;
    net?: string;
    module?: string;
  }>({ open: false });

  const payoutDate = (p: Payout) => p.session?.session_date ?? p.paid_at;
  const df = useDateFilter(data.map(payoutDate));
  const visible = (filter === "All" ? data : data.filter((p) => p.status === filter))
    .filter((p) => df.matchesDate(payoutDate(p)))
    .filter((p) => matchesSearch(search, p.practitioner?.name, p.session?.ref_code, p.session?.module, p.invoice_ref, p.status, p.payment_method, p.gross_amount, p.net_amount));

  const handleHardDelete = useCallback(
    (id: string, invoiceRef: string) => {
      setConfirmDialog({
        open: true,
        title: `Delete payout ${invoiceRef}`,
        description: "This removes the payout from all lists. It stays recoverable for 30 days, then is permanently purged.",
        onConfirm: async () => {
          setConfirmDialog((d) => ({ ...d, open: false }));
          const res = await fetch(`/api/admin/global/payouts/${id}`, { method: "DELETE" });
          if (res.ok) {
            setData((prev) => prev.filter((p) => p.id !== id));
            onHardDeleted?.(id);
          } else {
            setToast("Delete failed — please try again.");
            setTimeout(() => setToast(""), 3000);
          }
        },
      });
    },
    [onHardDeleted]
  );

  const markPaid = useCallback(
    async (id: string) => {
      const payment_method = methodMap[id] || "UPI";
      const res = await fetch(`/api/admin/payouts/${id}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidOn: new Date().toISOString(), payment_method }),
      });
      if (res.ok) {
        const paid_at = new Date().toISOString();
        setData((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "Paid", paid_at, payment_method } : p))
        );
        onRowChange?.(id, { status: "Paid", paid_at, payment_method });
        setToast("Payout marked as paid");
        setTimeout(() => setToast(""), 3000);
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(body.error ?? "Failed to mark payout as paid — please try again.");
        setTimeout(() => setToast(""), 5000);
      }
    },
    [methodMap, onRowChange]
  );

  const pending = data.filter((p) => p.status === "Pending");
  const totalPendingGross = pending.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalPendingNet = pending.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPendingTds = totalPendingGross - totalPendingNet;
  const totalGross = visible.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalNet = visible.reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <div>
      {pending.length > 0 && (
        <div
          style={{
            background: "#faeeda",
            border: "1px solid #fac775",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <strong>
            {pending.length} pending payout{pending.length > 1 ? "s" : ""}
          </strong>
          {" — "}gross: {formatInr(totalPendingGross)}
          {totalPendingTds > 0 && (
            <span style={{ color: "#854f0b" }}> · TDS: {formatInr(totalPendingTds)}</span>
          )}
          {" · "}net: <strong>{formatInr(totalPendingNet)}</strong>
        </div>
      )}

      <TableFilterBar options={PAYOUT_FILTERS} value={filter} onChange={setFilter} dateFilter={df.control} search={search} onSearchChange={setSearch} searchPlaceholder="Search payouts…" />
      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={data.length === 0 ? "No payouts yet" : "No payouts match the current filter"}
        connected
      >
        <>
          {visible.map((p) => {
            const detail = payToDetail(p);
            const ini = initials(p.practitioner?.name ?? "?");
            return (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                {/* Practitioner */}
                <td style={TD}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "#f5e9c8",
                        color: "#8a6510",
                        fontWeight: 600,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {ini}
                    </div>
                    <span style={{ fontWeight: 500 }}>{p.practitioner?.name ?? "—"}</span>
                  </div>
                </td>
                {/* Session */}
                <td style={TD}>
                  <div style={{ fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {p.session?.ref_code ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.session?.module}</div>
                </td>
                {/* Session date */}
                <td style={{ ...TD, fontSize: 13, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
                  {fmtSessionDate(p.session?.session_date ?? null)}
                </td>
                {/* Payout (₹) */}
                <td style={TD}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{formatInr(p.net_amount)}</div>
                </td>
                {/* Pay to */}
                <td style={TD}>
                  <div style={{ fontSize: 13 }}>{p.practitioner?.name ?? "—"}</div>
                  {detail && (
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "var(--ink-faint)",
                        marginTop: 1,
                      }}
                    >
                      {detail}
                    </div>
                  )}
                </td>
                {/* Method */}
                <td style={TD}>
                  {p.status === "Pending" && !readOnly ? (
                    <div>
                      <select
                        value={methodMap[p.id] ?? "UPI"}
                        onChange={(e) =>
                          setMethodMap((m) => ({ ...m, [p.id]: e.target.value }))
                        }
                        style={selectStyle}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {detail && (
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: "monospace",
                            color: "var(--ink-faint)",
                            marginTop: 3,
                          }}
                        >
                          {detail}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {paidMethodLabel(p)}
                    </span>
                  )}
                </td>
                {/* Invoice ref. */}
                <td style={TD}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                    {p.invoice_ref}
                  </span>
                </td>
                {/* Payment status */}
                <td style={TD}>
                  {p.status === "Paid" ? (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#d4edda",
                        color: "#2a6b2a",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 100,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtPaidAt(p.paid_at)}
                    </span>
                  ) : (
                    <StatusPill status={p.status} />
                  )}
                </td>
                {/* Action */}
                <td style={{ ...TD, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {p.status === "Pending" ? (
                      readOnly ? (
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>—</span>
                      ) : (
                      <>
                        <button
                          onClick={() => markPaid(p.id)}
                          style={{
                            background: "#c9982a",
                            color: "#14161d",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 12px",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: 600,
                          }}
                        >
                          Mark as paid
                        </button>
                        <button
                          onClick={() =>
                            setDraft({
                              open: true,
                              name: p.practitioner?.name ?? "",
                              invoice: p.invoice_ref,
                              net: formatInr(p.net_amount),
                              module: p.session?.module ?? "",
                            })
                          }
                          style={{
                            background: "rgba(20,18,12,.07)",
                            border: "none",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Draft reminder
                        </button>
                      </>
                      )
                    ) : (
                      <span style={{ fontSize: 12, color: "#2a6b2a", fontWeight: 500 }}>✓ Done</span>
                    )}
                    {isGlobalAdmin && onEdit && (
                      <button
                        onClick={() => onEdit(p.id)}
                        style={{ background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--ink-soft)", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
                        title={`Edit payout ${p.invoice_ref}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                    )}
                    {isGlobalAdmin && (
                      <button
                        onClick={() => handleHardDelete(p.id, p.invoice_ref)}
                        style={{ background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#991b1b", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3, transition: "background .12s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        title={`Delete payout ${p.invoice_ref}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Summary row — always rendered when isEmpty=false */}
          <tr style={{ background: "#f8f7f4", borderTop: "2px solid rgba(20,18,12,.10)" }}>
            <td
              colSpan={3}
              style={{
                ...TD,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Total ({visible.length} payout{visible.length > 1 ? "s" : ""})
            </td>
            <td style={TD}>
              <div style={{ fontWeight: 500 }}>{formatInr(totalGross)} gross</div>
              <div style={{ fontWeight: 600 }}>{formatInr(totalNet)} net</div>
            </td>
            <td colSpan={5} style={TD} />
          </tr>
        </>
      </AdminTable>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--ink)",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            zIndex: 9999,
          }}
        >
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
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

const CHEVRON_GOLD =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%238a6510' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 22px 4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(20,18,12,.18)",
  background: `${CHEVRON_GOLD} no-repeat right 7px center, #fcfbf8`,
  appearance: "none",
  WebkitAppearance: "none",
  color: "#14161d",
  cursor: "pointer",
  fontFamily: "inherit",
};
