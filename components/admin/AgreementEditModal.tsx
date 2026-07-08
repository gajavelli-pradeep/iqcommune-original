"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, fieldSelectStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";
import type { Agreement } from "@/components/admin/AgreementTable";

const KNOWN_STATUSES = ["Pending signature", "Active"];

function fromRecord(a: Agreement) {
  return {
    refCode:         a.ref_code ?? "",
    module:          a.module ?? "",
    status:          a.status ?? "Pending signature",
    signatureMethod: a.signature_method ?? "",
    signedAt:        a.signed_at ? a.signed_at.slice(0, 10) : "",
  };
}

export function AgreementEditModal({
  open,
  onClose,
  initialData,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialData: Agreement;
  onSaved: (a: Agreement) => void;
}) {
  const [form, setForm] = useState(() => fromRecord(initialData));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Keep the record's current status selectable even if it isn't a known one.
  const statuses = KNOWN_STATUSES.includes(form.status) ? KNOWN_STATUSES : [form.status, ...KNOWN_STATUSES];

  const set = (k: keyof ReturnType<typeof fromRecord>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    if (!form.refCode || !form.module || !form.status) {
      setError("Reference code, module and status are required.");
      return;
    }
    setSaving(true);

    const patch = {
      ref_code:         form.refCode,
      module:           form.module,
      status:           form.status,
      signature_method: form.signatureMethod || null,
      signed_at:        form.signedAt ? new Date(form.signedAt).toISOString() : null,
    };

    let res: Response;
    try {
      res = await fetch(`/api/admin/global/agreements/${initialData.id}`, {
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
    onSaved({ ...initialData, ...patch });
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit agreement"
      subtitle={initialData.practitioner_name ? `For ${initialData.practitioner_name}` : "Update this agreement"}
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
        <Field label="Reference code *"><input id="ae-ref" name="ae-ref" style={fieldInputStyle} value={form.refCode} onChange={set("refCode")} /></Field>
        <Field label="Module *"><input id="ae-module" name="ae-module" style={fieldInputStyle} value={form.module} onChange={set("module")} /></Field>
        <Field label="Status *">
          <select id="ae-status" name="ae-status" style={fieldSelectStyle} value={form.status} onChange={set("status")}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Signature method"><input id="ae-method" name="ae-method" style={fieldInputStyle} placeholder="e.g. Typed / Drawn" value={form.signatureMethod} onChange={set("signatureMethod")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Signed on"><input id="ae-signed-at" name="ae-signed-at" type="date" style={fieldInputStyle} value={form.signedAt} onChange={set("signedAt")} /></Field>
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
