"use client";

import { useState, useCallback } from "react";
import { StatusPill, StatusSelect } from "@/components/shared/StatusPill";
import { formatInr } from "@/lib/tds";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { initials } from "@/lib/format";
import { useUndoToast } from "@/components/admin/useUndoToast";

// V5-MATCH: the mockup shows two pending cards (count + amount) and no summary
// banner, no totals row, and inline Revert instead of Edit. The banner/totals/Edit
// are gated off (re-enablable improvements) — see ADMIN-V5-SPECDIFF.md.
const SHOW_OFFSPEC_ACTIONS = false;

interface Payout {
  id: string;
  invoice_ref: string;
  gross_amount: number;
  net_amount: number;
  payment_method: string | null;
  pay_to: string | null;
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

type EditableField = "pay_to" | "invoice_ref";
type FieldPatch = { pay_to?: string | null; payment_method?: string | null; invoice_ref?: string };


const HEADERS = [
  "Practitioner",
  "Session",
  "Session date",
  "Gross Payout (₹)",
  "Net Payout (₹)",
  "Pay to",
  "Invoice ref.",
  "Actions",
  "Payment status",
];

function fmtSessionDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Derived payment destination from the practitioner record (the prefill / fallback).
function payToDetail(p: Payout): string {
  if (p.practitioner?.upi_id) return p.practitioner.upi_id;
  if (p.practitioner?.bank_account && p.practitioner?.bank_name)
    return `${p.practitioner.bank_name} ···${p.practitioner.bank_account.slice(-4)}`;
  return "";
}

// Effective "Pay to" destination: the manual override if set, else the derived value.
function payToDisplay(p: Payout): string {
  return p.pay_to ?? payToDetail(p);
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
  onFieldSaved,
  isGlobalAdmin = false,
  readOnly = false,
  onEdit,
}: {
  initialData: Payout[];
  onRowChange?: (id: string, patch: { status: string; paid_at: string; payment_method: string | null }) => void;
  onFieldSaved?: (id: string, patch: FieldPatch) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  onEdit?: (id: string) => void;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState("All");
  // Reflect parent-driven updates (e.g. a global-admin edit) without an effect.
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) { setPrevInitial(initialData); setData(initialData); }
  const [toast, setToast] = useState("");
  const undo = useUndoToast();
  // Inline-edit buffer for the Invoice-ref field (keyed `${id}:${field}`),
  // lazily sourced from the row's persisted value until the admin touches it.
  const [edits, setEdits] = useState<Record<string, string>>({});

  const payoutDate = (p: Payout) => p.session?.session_date ?? p.paid_at;
  const df = useDateFilter(data.map(payoutDate));
  const visible = (filter === "All" ? data : data.filter((p) => p.status === filter))
    .filter((p) => df.matchesDate(payoutDate(p)));
  const pendingCount = data.filter((p) => p.status === "Pending" && df.matchesDate(payoutDate(p))).length;

  // ── Manual-field resolvers (source: local edit buffer → persisted value → default)
  const editKey = (id: string, field: EditableField) => `${id}:${field}`;
  const fieldValue = (p: Payout, field: EditableField): string => {
    const k = editKey(p.id, field);
    if (k in edits) return edits[k];
    return field === "pay_to" ? payToDisplay(p) : p.invoice_ref;
  };

  // Persist a manual field on a Pending row. Optimistic: updates local state + parent
  // on success; on failure the row re-sources from its unchanged persisted value.
  const saveField = useCallback(
    async (id: string, patch: FieldPatch): Promise<boolean> => {
      let res: Response;
      try {
        res = await fetch(`/api/admin/payouts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        // Without this the throw escapes to commitText's caller, the edit buffer is
        // never cleared, and the cell silently keeps a value that was never saved.
        setToast("Network error — the change wasn't saved. Please try again.");
        setTimeout(() => setToast(""), 4000);
        return false;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(body.error ?? "Couldn't save — please try again.");
        setTimeout(() => setToast(""), 4000);
        return false;
      }
      setData((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      onFieldSaved?.(id, patch);
      return true;
    },
    [onFieldSaved]
  );

  // Commit a buffered Pay-to / Invoice-ref edit on blur; no-op if unchanged.
  const commitText = async (p: Payout, field: EditableField) => {
    const k = editKey(p.id, field);
    if (!(k in edits)) return;
    const next = edits[k].trim();
    const base = field === "pay_to" ? payToDisplay(p) : p.invoice_ref;
    const clearBuffer = () => setEdits((m) => { const rest = { ...m }; delete rest[k]; return rest; });
    if (next === base) return clearBuffer();
    if (field === "invoice_ref" && !next) {
      setToast("Invoice reference can't be empty.");
      setTimeout(() => setToast(""), 3000);
      return clearBuffer(); // revert to the persisted ref
    }
    const patch: FieldPatch = field === "pay_to" ? { pay_to: next || null } : { invoice_ref: next };
    await saveField(p.id, patch);
    clearBuffer(); // success → data holds new value; failure → revert (toast already shown)
  };

  const markPaid = useCallback(
    async (id: string, payment_method: string) => {
      let res: Response;
      try {
        res = await fetch(`/api/admin/payouts/${id}/mark-paid`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paidOn: new Date().toISOString(), payment_method }),
        });
      } catch {
        // No busy guard on this button, so an unhandled throw produced literally no
        // feedback — the click just looked ignored.
        setToast("Network error — the payout was not marked paid. Please try again.");
        setTimeout(() => setToast(""), 5000);
        return;
      }
      if (res.ok) {
        const paid_at = new Date().toISOString();
        setData((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "Paid", paid_at, payment_method } : p))
        );
        onRowChange?.(id, { status: "Paid", paid_at, payment_method });
        // Reverting a Paid payout is a Global-Admin-only ledger correction (the
        // revert endpoint is requireGlobalAdmin-gated), so only offer Undo to
        // global admins — a plain admin's undo would 403. Others get a plain toast.
        if (isGlobalAdmin) {
          undo.show("Payout marked as paid", async () => {
            let revert: Response;
            try {
              revert = await fetch(`/api/admin/global/payouts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Pending", paid_at: null, payment_method: null }),
              });
            } catch {
              setToast("Network error — could not undo. The payout is still marked paid.");
              setTimeout(() => setToast(""), 4000);
              return;
            }
            if (!revert.ok) {
              setToast("Could not undo — the payout is still marked paid.");
              setTimeout(() => setToast(""), 4000);
              return;
            }
            setData((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, status: "Pending", paid_at: null, payment_method: null } : p
              )
            );
            onRowChange?.(id, { status: "Pending", paid_at: "", payment_method: null });
          });
        } else {
          setToast("Payout marked as paid");
          setTimeout(() => setToast(""), 3000);
        }
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(body.error ?? "Failed to mark payout as paid — please try again.");
        setTimeout(() => setToast(""), 5000);
      }
    },
    [onRowChange, isGlobalAdmin, undo]
  );


  const pending = data.filter((p) => p.status === "Pending");
  const totalPendingGross = pending.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalPendingNet = pending.reduce((sum, p) => sum + p.net_amount, 0);
  const totalPendingTds = totalPendingGross - totalPendingNet;
  const totalGross = visible.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalNet = visible.reduce((sum, p) => sum + p.net_amount, 0);

  return (
    <div>
      {SHOW_OFFSPEC_ACTIONS && pending.length > 0 && (
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

      <PendingBar
        pendingCards={[
          {
            count: pendingCount,
            label: "Sessions pending payment",
            active: filter === "Pending",
            onToggle: () => setFilter(filter === "Pending" ? "All" : "Pending"),
          },
          {
            // V5: second card shows the summed pending ₹ amount.
            count: 0,
            display: formatInr(totalPendingNet),
            label: "Amount pending",
            active: filter === "Pending",
            onToggle: () => setFilter(filter === "Pending" ? "All" : "Pending"),
          },
        ]}
        dateFilter={df.control}
        dateLabel="Session date:"
      />
      <AdminTable
        headers={HEADERS}
        isEmpty={visible.length === 0}
        emptyText={data.length === 0 ? "No payouts yet" : "No payouts match the current filter"}
        connected
      >
        <>
          {visible.map((p) => {
            const ini = initials(p.practitioner?.name ?? "?");
            // Manual fields are editable while Pending; frozen once Paid / in read-only views.
            const editable = p.status === "Pending" && !readOnly;
            return (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
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
                {/* Gross Payout (₹) */}
                <td style={TD}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{formatInr(p.gross_amount)}</div>
                </td>
                {/* Net Payout (₹) */}
                <td style={TD}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{formatInr(p.net_amount)}</div>
                </td>
                {/* Pay to — V6: read-only payee name only */}
                <td style={TD}>
                  <div style={{ fontSize: 13 }}>{p.practitioner?.name ?? "—"}</div>
                </td>
                {/* Invoice ref. — auto-generated prefill, manually overridable */}
                <td style={TD}>
                  {editable ? (
                    <input
                      value={fieldValue(p, "invoice_ref")}
                      onChange={(e) => setEdits((m) => ({ ...m, [editKey(p.id, "invoice_ref")]: e.target.value }))}
                      onBlur={() => commitText(p, "invoice_ref")}
                      aria-label="Invoice reference"
                      style={{ ...inlineInput, fontFamily: "monospace", minWidth: 130 }}
                    />
                  ) : (
                    <span style={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>
                      {p.invoice_ref}
                    </span>
                  )}
                </td>
                {/* Actions — V6: before Payment status. Method picker relocated here
                    (from the dropped Method column) so method is still captured. */}
                <td style={{ ...TD, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {p.status === "Pending" ? (
                      readOnly ? (
                        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>—</span>
                      ) : (
                      // V6: mark-paid dropdown is the only Action (method picker + Draft reminder removed).
                      <StatusSelect
                        value={p.status}
                        options={["Pending", "Paid"]}
                        ariaLabel={`Set payout status for ${p.invoice_ref}`}
                        onChange={(next) => { if (next === "Paid") markPaid(p.id, p.payment_method ?? ""); }}
                      />
                      )
                    ) : (
                      <span style={{ fontSize: 12, color: "#2a6b2a", fontWeight: 500 }}>✓ Done</span>
                    )}
                    {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit && (
                      <button
                        onClick={() => onEdit(p.id)}
                        style={{ background: "none", border: "1px solid rgba(15,17,23,.18)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--ink-soft)", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
                        title={`Edit payout ${p.invoice_ref}`}
                      >
                        <svg width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                    )}
                    {/* V5 P2-7: payouts have no delete, ever, by design — they are permanent
                        financial records. Corrections go through Revert (in the edit modal). */}
                  </div>
                </td>
                {/* Payment status — V6: last column, after Actions */}
                <td style={TD}>
                  {p.status === "Paid" ? (
                    <span style={{ display: "inline-block", background: "var(--green-light)", color: "var(--green)", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, whiteSpace: "nowrap" }}>
                      {fmtPaidAt(p.paid_at)}
                    </span>
                  ) : (
                    <StatusPill status={p.status} />
                  )}
                </td>
              </tr>
            );
          })}

          {/* V5-MATCH: totals summary row not in the mockup — gated off. */}
          {SHOW_OFFSPEC_ACTIONS && (
          <tr style={{ background: "#f8f7f4", borderTop: "2px solid rgba(15,17,23,.10)" }}>
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
            </td>
            <td style={TD}>
              <div style={{ fontWeight: 600 }}>{formatInr(totalNet)} net</div>
            </td>
            <td colSpan={4} style={TD} />
          </tr>
          )}
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
      {undo.node}

    </div>
  );
}


// Inline text-edit affordance for manual Pending-row fields (Pay to / Invoice / Other method).
const inlineInput: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(15,17,23,.18)",
  background: "#fcfbf8",
  color: "#14161d",
  fontFamily: "inherit",
  width: "100%",
  maxWidth: 180,
  boxSizing: "border-box",
};
