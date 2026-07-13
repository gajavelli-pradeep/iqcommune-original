"use client";

import { useState, useEffect } from "react";
import {
  FormModal,
  fieldLabelStyle,
  fieldInputStyle,
  fieldSelectStyle,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/FormModal";
import type { Database } from "@/lib/supabase/database.types";

type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string; session_date: string | null } | null;
  practitioner: { name: string; upi_id: string | null; bank_account: string | null; bank_name: string | null } | null;
};

interface SessionOption {
  id: string;
  ref_code: string;
  module: string;
  session_date: string | null;
  practitioner_id: string;
  practitioner: { name: string; email: string } | null;
}

const PAYMENT_METHODS = ["UPI", "NEFT", "IMPS", "Cheque"] as const;

export function PayoutFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: PayoutRow) => void;
}) {
  const empty = { sessionId: "", invoiceRef: "", grossAmount: "", tdsRate: "", paymentMethod: "" };
  const [form, setForm] = useState(empty);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const gross = Number(form.grossAmount) || 0;
  const tdsRate = Number(form.tdsRate) || 0;
  const net = gross > 0 ? Math.round(gross - (gross * tdsRate) / 100) : 0;
  const tdsAmount = gross - net;

  const selectedSession = sessions.find((s) => s.id === form.sessionId) ?? null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Load inside a nested async fn so the loading setState isn't a synchronous
    // statement in the effect body (avoids the cascading-render lint rule).
    (async () => {
      setLoadingSessions(true);
      try {
        const r = await fetch("/api/admin/sessions");
        const { data } = await r.json();
        if (!cancelled) setSessions((data as SessionOption[]) ?? []);
      } catch {
        // ignore — modal shows empty session list
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    if (!form.sessionId || !form.invoiceRef || !form.grossAmount) {
      setError("Session, invoice ref, and gross amount are required.");
      return;
    }
    if (!selectedSession) {
      setError("Select a valid session.");
      return;
    }
    setSaving(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: form.sessionId,
          practitionerId: selectedSession.practitioner_id,
          invoiceRef: form.invoiceRef,
          grossAmount: gross,
          netAmount: net,
          tdsRate: tdsRate > 0 ? tdsRate : undefined,
          paymentMethod: form.paymentMethod || undefined,
        }),
      });
    } catch {
      setSaving(false);
      setError("Network error — please try again.");
      return;
    }
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError((body as { error?: string }).error ?? "Could not create payout. Check the fields and try again.");
      return;
    }
    const { data } = await res.json();
    onCreated({
      ...(data as Database["public"]["Tables"]["payouts"]["Row"]),
      session: {
        ref_code: selectedSession.ref_code,
        module: selectedSession.module,
        session_date: selectedSession.session_date,
      },
      practitioner: selectedSession.practitioner
        ? { name: selectedSession.practitioner.name, upi_id: null, bank_account: null, bank_name: null }
        : null,
    });
    setForm(empty);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Create payout"
      subtitle="Manually record a payout for a session"
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Creating…" : "Create payout"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Session *">
            <select
              id="pf-session"
              name="pf-session"
              style={fieldSelectStyle}
              value={form.sessionId}
              onChange={set("sessionId")}
            >
              <option value="">
                {loadingSessions ? "Loading sessions…" : "— select session —"}
              </option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ref_code} · {s.module} · {s.session_date ?? ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {selectedSession && (
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "var(--surface-soft)",
              borderRadius: 6,
              padding: "6px 10px",
            }}
          >
            Practitioner:{" "}
            <strong>{selectedSession.practitioner?.name ?? "Unknown"}</strong>
          </div>
        )}

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Invoice reference *">
            <input
              id="pf-invoice-ref"
              name="pf-invoice-ref"
              style={fieldInputStyle}
              placeholder="IQC-PAY-0001"
              value={form.invoiceRef}
              onChange={set("invoiceRef")}
            />
          </Field>
        </div>

        <Field label="Gross amount (₹) *">
          <input
            id="pf-gross"
            name="pf-gross"
            type="number"
            min={1}
            style={fieldInputStyle}
            value={form.grossAmount}
            onChange={set("grossAmount")}
          />
        </Field>

        <Field label="TDS rate (%)">
          <input
            id="pf-tds"
            name="pf-tds"
            type="number"
            min={0}
            max={100}
            style={fieldInputStyle}
            placeholder="0"
            value={form.tdsRate}
            onChange={set("tdsRate")}
          />
        </Field>

        {gross > 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "var(--surface-soft)",
              borderRadius: 6,
              padding: "6px 10px",
            }}
          >
            Net amount:{" "}
            <strong>₹{net.toLocaleString("en-IN")}</strong>
            {tdsAmount > 0 && (
              <> (TDS deducted: ₹{tdsAmount.toLocaleString("en-IN")})</>
            )}
          </div>
        )}

        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Payment method">
            <select
              id="pf-method"
              name="pf-method"
              style={fieldSelectStyle}
              value={form.paymentMethod}
              onChange={set("paymentMethod")}
            >
              <option value="">— optional —</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#a32d2d" }}>{error}</div>
      )}
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
