"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, fieldSelectStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";
import type { Database } from "@/lib/supabase/database.types";

export type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: { name: string; upi_id: string | null; bank_account: string | null; bank_name: string | null } | null;
};

const STATUSES = ["Pending", "Paid"] as const;
const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;

function fromRecord(p: PayoutRow) {
  return {
    invoiceRef:    p.invoice_ref ?? "",
    grossAmount:   p.gross_amount != null ? String(p.gross_amount) : "",
    tdsRate:       p.tds_rate != null ? String(p.tds_rate) : "",
    paymentMethod: p.payment_method ?? "",
    status:        p.status ?? "Pending",
    paidAt:        p.paid_at ? p.paid_at.slice(0, 10) : "",
  };
}

export function PayoutEditModal({
  open,
  onClose,
  initialData,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialData: PayoutRow;
  onSaved: (p: PayoutRow) => void;
}) {
  const [form, setForm] = useState(() => fromRecord(initialData));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const gross = Number(form.grossAmount) || 0;
  const tds = Number(form.tdsRate) || 0;
  const net = gross > 0 ? Math.round(gross - (gross * tds) / 100) : 0;
  const isPaid = form.status === "Paid";

  const set = (k: keyof ReturnType<typeof fromRecord>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    if (!form.invoiceRef || !form.grossAmount) {
      setError("Invoice reference and gross amount are required.");
      return;
    }
    setSaving(true);

    const paidAtIso = isPaid && form.paidAt ? new Date(form.paidAt).toISOString() : null;
    const patch = {
      invoice_ref:    form.invoiceRef,
      gross_amount:   gross,
      tds_rate:       tds > 0 ? tds : null,
      payment_method: form.paymentMethod ? (form.paymentMethod as (typeof PAYMENT_METHODS)[number]) : null,
      status:         form.status,
      paid_at:        paidAtIso,
    };

    let res: Response;
    try {
      res = await fetch(`/api/admin/super/payouts/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      setSaving(false);
      setError("Network error — please try again.");
      return;
    }
    setSaving(false);
    if (!res.ok) { setError("Could not save changes. Check the fields and try again."); return; }
    // net_amount is recomputed server-side; mirror the same formula locally.
    onSaved({ ...initialData, ...patch, net_amount: net });
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit payout"
      subtitle={initialData.session ? `${initialData.session.ref_code} · ${initialData.practitioner?.name ?? ""}` : "Update this payout"}
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Invoice reference *"><input id="pe-invoice" name="pe-invoice" style={fieldInputStyle} value={form.invoiceRef} onChange={set("invoiceRef")} /></Field>
        </div>
        <Field label="Gross amount (₹) *"><input id="pe-gross" name="pe-gross" type="number" min={1} style={fieldInputStyle} value={form.grossAmount} onChange={set("grossAmount")} /></Field>
        <Field label="TDS rate (%)"><input id="pe-tds" name="pe-tds" type="number" min={0} max={100} style={fieldInputStyle} value={form.tdsRate} onChange={set("tdsRate")} /></Field>
        {gross > 0 && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--ink-soft)", background: "var(--surface-soft)", borderRadius: 6, padding: "6px 10px" }}>
            Net amount: <strong>₹{net.toLocaleString("en-IN")}</strong>
            {gross - net > 0 && <> (TDS deducted: ₹{(gross - net).toLocaleString("en-IN")})</>}
          </div>
        )}
        <Field label="Payment status">
          <select id="pe-status" name="pe-status" style={fieldSelectStyle} value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Payment method">
          <select id="pe-method" name="pe-method" style={fieldSelectStyle} value={form.paymentMethod} onChange={set("paymentMethod")}>
            <option value="">— none —</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Paid on">
            <input id="pe-paid-at" name="pe-paid-at" type="date" style={{ ...fieldInputStyle, opacity: isPaid ? 1 : 0.5 }} disabled={!isPaid} value={form.paidAt} onChange={set("paidAt")} />
          </Field>
        </div>
      </div>
      {error && <div style={{ marginTop: 12, fontSize: 12, color: "#a32d2d" }}>{error}</div>}
    </FormModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}
