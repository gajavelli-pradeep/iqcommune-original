"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";
import type { Database } from "@/lib/supabase/database.types";

type Practitioner = Database["public"]["Tables"]["practitioners"]["Row"];

const STATUSES = ["Applied", "Under Review", "Screening Done", "Agreement Sent", "Empanelled", "Rejected"] as const;

export function PractitionerFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (p: Practitioner) => void;
}) {
  const empty = { name: "", email: "", role: "", city: "", experience: "", phone: "", org: "", modules: "", status: "Applied" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    if (!form.name || !form.email || !form.role || !form.city || !form.experience) {
      setError("Name, email, role, city and experience are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/practitioners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        role: form.role,
        city: form.city,
        experience: form.experience,
        phone: form.phone || undefined,
        org: form.org || undefined,
        modules: form.modules.split(",").map((m) => m.trim()).filter(Boolean),
        status: form.status,
      }),
    });
    setSaving(false);
    if (res.status === 409) { setError("A practitioner with this email already exists."); return; }
    if (!res.ok) { setError("Could not add practitioner. Check the fields and try again."); return; }
    const { data } = await res.json();
    onCreated(data as Practitioner);
    setForm(empty);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Add practitioner"
      subtitle="Manually create a practitioner record"
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? "Adding…" : "Add practitioner"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <Field label="Name *"><input style={fieldInputStyle} value={form.name} onChange={set("name")} /></Field>
        <Field label="Email *"><input type="email" style={fieldInputStyle} value={form.email} onChange={set("email")} /></Field>
        <Field label="Role / title *"><input style={fieldInputStyle} value={form.role} onChange={set("role")} /></Field>
        <Field label="City *"><input style={fieldInputStyle} value={form.city} onChange={set("city")} /></Field>
        <Field label="Experience *"><input style={fieldInputStyle} placeholder="e.g. 9 – 12 years" value={form.experience} onChange={set("experience")} /></Field>
        <Field label="Phone"><input style={fieldInputStyle} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Organisation"><input style={fieldInputStyle} value={form.org} onChange={set("org")} /></Field>
        <Field label="Status">
          <select style={fieldInputStyle} value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Modules (comma-separated)">
            <input style={fieldInputStyle} placeholder="Personal Finance, Tax Planning" value={form.modules} onChange={set("modules")} />
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
