"use client";

import { useState, useCallback } from "react";
import { StatusPill, StatusSelect } from "@/components/shared/StatusPill";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";
import { sendReminderRequest } from "@/lib/admin/send-reminder";
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

const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;
// Dropdown adds an "Other" escape → free-text method (client wants a manual field).
const METHOD_OPTIONS = [...PAYMENT_METHODS, "Other"] as const;
const isPresetMethod = (m: string): boolean => (PAYMENT_METHODS as readonly string[]).includes(m);

const HEADERS = [
  "Practitioner",
  "Session",
  "Session date",
  "Payout (₹)",
  "Pay to",
  "Method",
  "Invoice ref.",
  "Payment status",
  "Actions",
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

function paidMethodLabel(p: Payout): string {
  const method = p.payment_method ?? "—";
  const dest = payToDisplay(p);
  return dest ? `${method} — ${dest}` : method;
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
  // Inline-edit state for the manual fields. `methodSel` holds the dropdown choice
  // (a preset or "Other"); `methodOther` holds the free-text when "Other"; `edits`
  // buffers in-progress Pay-to / Invoice-ref text (keyed `${id}:${field}`). All are
  // lazily sourced from the row's persisted value until the admin touches them.
  const [methodSel, setMethodSel] = useState<Record<string, string>>({});
  const [methodOther, setMethodOther] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<{
    open: boolean;
    id?: string;
    name?: string;
    invoice?: string;
    net?: string;
    module?: string;
  }>({ open: false });

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
  const methodSelValue = (p: Payout): string => {
    if (p.id in methodSel) return methodSel[p.id];
    const pm = p.payment_method;
    if (!pm) return "UPI";
    return isPresetMethod(pm) ? pm : "Other";
  };
  const methodOtherValue = (p: Payout): string => {
    if (p.id in methodOther) return methodOther[p.id];
    const pm = p.payment_method;
    return pm && !isPresetMethod(pm) ? pm : "";
  };
  const effectiveMethod = (p: Payout): string => {
    const sel = methodSelValue(p);
    return sel === "Other" ? methodOtherValue(p).trim() || "UPI" : sel;
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

  // V5: persistent Revert on Paid rows (Global-Admin ledger correction). Same
  // endpoint the post-mark-paid Undo uses, exposed as a standing button too.
  const revertPayout = useCallback(
    async (id: string) => {
      let revert: Response;
      try {
        revert = await fetch(`/api/admin/global/payouts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Pending", paid_at: null, payment_method: null }),
        });
      } catch {
        setToast("Network error — the payout was not reverted. Please try again.");
        setTimeout(() => setToast(""), 4000);
        return;
      }
      if (!revert.ok) {
        setToast("Could not revert — the payout is still marked paid.");
        setTimeout(() => setToast(""), 4000);
        return;
      }
      setData((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "Pending", paid_at: null, payment_method: null } : p))
      );
      onRowChange?.(id, { status: "Pending", paid_at: "", payment_method: null });
      setToast("Payout reverted to Pending");
      setTimeout(() => setToast(""), 3000);
    },
    [onRowChange]
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
            const detail = payToDisplay(p);
            const ini = initials(p.practitioner?.name ?? "?");
            // Manual fields are editable while Pending; frozen once Paid / in read-only views.
            const editable = p.status === "Pending" && !readOnly;
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
                {/* Pay to — manual override of the payment destination */}
                <td style={TD}>
                  <div style={{ fontSize: 13 }}>{p.practitioner?.name ?? "—"}</div>
                  {editable ? (
                    <input
                      value={fieldValue(p, "pay_to")}
                      onChange={(e) => setEdits((m) => ({ ...m, [editKey(p.id, "pay_to")]: e.target.value }))}
                      onBlur={() => commitText(p, "pay_to")}
                      placeholder="UPI / bank / payee"
                      aria-label={`Pay to destination for ${p.invoice_ref}`}
                      // Floor the width so the column can't collapse (UPI IDs / bank
                      // strings are long); the table scrolls horizontally, so a wider
                      // cell is safe. Overrides inlineInput's 180px cap.
                      style={{ ...inlineInput, fontFamily: "monospace", marginTop: 2, minWidth: 200, maxWidth: 300 }}
                    />
                  ) : (
                    detail && (
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
                    )
                  )}
                </td>
                {/* Method — preset dropdown + "Other" free-text escape */}
                <td style={TD}>
                  {editable ? (
                    <div>
                      <select
                        value={methodSelValue(p)}
                        onChange={(e) => {
                          const sel = e.target.value;
                          setMethodSel((m) => ({ ...m, [p.id]: sel }));
                          // Persist immediately for a preset; for "Other" wait for the text.
                          if (sel !== "Other") saveField(p.id, { payment_method: sel });
                        }}
                        aria-label={`Payment method for ${p.invoice_ref}`}
                        style={selectStyle}
                      >
                        {METHOD_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {methodSelValue(p) === "Other" && (
                        <input
                          value={methodOtherValue(p)}
                          onChange={(e) => setMethodOther((m) => ({ ...m, [p.id]: e.target.value }))}
                          onBlur={() => {
                            const v = methodOtherValue(p).trim();
                            if (v && v !== p.payment_method) saveField(p.id, { payment_method: v });
                          }}
                          placeholder="Method"
                          aria-label={`Custom payment method for ${p.invoice_ref}`}
                          style={{ ...inlineInput, marginTop: 4 }}
                        />
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {paidMethodLabel(p)}
                    </span>
                  )}
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
                        {/* Op-procedure Part 7 step 36: set the dropdown to Paid — the final step. */}
                        <StatusSelect
                          value={p.status}
                          options={["Pending", "Paid"]}
                          ariaLabel={`Set payout status for ${p.invoice_ref}`}
                          onChange={(next) => { if (next === "Paid") markPaid(p.id, effectiveMethod(p)); }}
                        />
                        <button
                          onClick={() =>
                            setDraft({
                              open: true,
                              id: p.id,
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
                      <>
                        <span style={{ fontSize: 12, color: "#2a6b2a", fontWeight: 500 }}>✓ Done</span>
                        {isGlobalAdmin && (
                          <button
                            onClick={() => revertPayout(p.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--surface)", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-soft)" }}
                            title="Revert this payout to Pending (record correction)"
                          >
                            <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                            Revert
                          </button>
                        )}
                      </>
                    )}
                    {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit && (
                      <button
                        onClick={() => onEdit(p.id)}
                        style={{ background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "var(--ink-soft)", fontSize: 11, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 3 }}
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
              </tr>
            );
          })}

          {/* V5-MATCH: totals summary row not in the mockup — gated off. */}
          {SHOW_OFFSPEC_ACTIONS && (
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

      <ContactDraftModal
        open={draft.open}
        onClose={() => setDraft({ open: false })}
        title={`Payout reminder — ${draft.name}`}
        subject={`Payout reminder: ${draft.invoice}`}
        emailBody={`Dear ${draft.name},\n\nThis is a reminder regarding your payout for the ${draft.module} session.\n\nInvoice ref: ${draft.invoice}\nNet payout: ${draft.net}\n\nPlease confirm receipt of this payout or let us know if you have any questions.\n\nWarm regards,\nThe iqcommune Team`}
        waBody={`Hi ${draft.name}! 👋\n\nJust a quick note from the iqcommune team — your payout for the *${draft.module}* session is ready.\n\nInvoice: *${draft.invoice}*\nNet: *${draft.net}*\n\nLet us know if you have any questions!`}
        recipientName={draft.name}
        onSend={draft.id ? () => sendReminderRequest(`/api/admin/payouts/${draft.id}/send-reminder`) : undefined}
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

// Inline text-edit affordance for manual Pending-row fields (Pay to / Invoice / Other method).
const inlineInput: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid rgba(20,18,12,.18)",
  background: "#fcfbf8",
  color: "#14161d",
  fontFamily: "inherit",
  width: "100%",
  maxWidth: 180,
  boxSizing: "border-box",
};
