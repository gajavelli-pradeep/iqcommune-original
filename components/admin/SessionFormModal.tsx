"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";

interface PractitionerOption {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface NewSession {
  id: string;
  ref_code: string;
  module: string;
  practitioner_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  audience_type: string;
  participants: number;
  payout_amount: number;
  tds_applicable: boolean;
  tds_rate: number | null;
  consent_status: string;
  status: string;
  request_id: string | null;
  created_at: string;
  practitioner: { name: string; email: string } | null;
  payout_id?: string | null;
}

export function SessionFormModal({
  open,
  onClose,
  practitioners,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  practitioners: PractitionerOption[];
  onCreated: (s: NewSession) => void;
}) {
  const eligible = practitioners.filter((p) => p.status === "Empanelled");
  const empty = { refCode: "", module: "", practitionerId: "", sessionDate: "", startTime: "", endTime: "", venue: "", audienceType: "", participants: "", payoutAmount: "", tdsApplicable: false, tdsRate: "10" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "tdsApplicable" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function submit() {
    setError("");
    const required = [form.refCode, form.module, form.practitionerId, form.sessionDate, form.startTime, form.endTime, form.venue, form.audienceType, form.participants, form.payoutAmount];
    if (required.some((v) => !v)) { setError("All fields except TDS are required."); return; }

    setSaving(true);
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refCode: form.refCode,
        module: form.module,
        practitionerId: form.practitionerId,
        sessionDate: form.sessionDate,
        startTime: form.startTime,
        endTime: form.endTime,
        venue: form.venue,
        audienceType: form.audienceType,
        participants: Number(form.participants),
        payoutAmount: Number(form.payoutAmount),
        tdsApplicable: form.tdsApplicable,
        tdsRate: form.tdsApplicable ? Number(form.tdsRate) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Could not create session. Check the fields and try again."); return; }
    const { id } = await res.json();
    const pr = eligible.find((p) => p.id === form.practitionerId);
    onCreated({
      id,
      ref_code: form.refCode,
      module: form.module,
      practitioner_id: form.practitionerId,
      session_date: form.sessionDate,
      start_time: form.startTime,
      end_time: form.endTime,
      venue: form.venue,
      audience_type: form.audienceType,
      participants: Number(form.participants),
      payout_amount: Number(form.payoutAmount),
      tds_applicable: form.tdsApplicable,
      tds_rate: form.tdsApplicable ? Number(form.tdsRate) : null,
      consent_status: "Pending consent",
      status: "Upcoming",
      request_id: null,
      created_at: new Date().toISOString(),
      practitioner: pr ? { name: pr.name, email: pr.email } : null,
      payout_id: null,
    });
    setForm(empty);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Create session"
      subtitle="Schedule a new session for an empanelled practitioner"
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...primaryBtn, background: "#c9982a", opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? "Creating…" : "Create session"}
          </button>
        </>
      }
    >
      {eligible.length === 0 && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#854f0b", background: "#faeeda", border: "1px solid #fac775", borderRadius: 8, padding: "8px 12px" }}>
          No empanelled practitioners yet — empanel a practitioner before creating sessions.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <Field label="Reference code"><input style={fieldInputStyle} placeholder="IQC-SES-0003" value={form.refCode} onChange={set("refCode")} /></Field>
        <Field label="Module"><input style={fieldInputStyle} value={form.module} onChange={set("module")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Practitioner">
            <select style={fieldInputStyle} value={form.practitionerId} onChange={set("practitionerId")}>
              <option value="">— select practitioner —</option>
              {eligible.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Date"><input type="date" style={fieldInputStyle} value={form.sessionDate} onChange={set("sessionDate")} /></Field>
        <Field label="Venue"><input style={fieldInputStyle} value={form.venue} onChange={set("venue")} /></Field>
        <Field label="Start time"><input type="time" style={fieldInputStyle} value={form.startTime} onChange={set("startTime")} /></Field>
        <Field label="End time"><input type="time" style={fieldInputStyle} value={form.endTime} onChange={set("endTime")} /></Field>
        <Field label="Audience type"><input style={fieldInputStyle} value={form.audienceType} onChange={set("audienceType")} /></Field>
        <Field label="Participants"><input type="number" min={1} style={fieldInputStyle} value={form.participants} onChange={set("participants")} /></Field>
        <Field label="Payout amount (₹)"><input type="number" min={1} style={fieldInputStyle} value={form.payoutAmount} onChange={set("payoutAmount")} /></Field>
        <Field label="TDS rate (%)">
          <input type="number" min={0} max={100} style={{ ...fieldInputStyle, opacity: form.tdsApplicable ? 1 : 0.5 }} disabled={!form.tdsApplicable} value={form.tdsRate} onChange={set("tdsRate")} />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
          <input id="tdsApplicable" type="checkbox" checked={form.tdsApplicable} onChange={set("tdsApplicable")} style={{ cursor: "pointer" }} />
          <label htmlFor="tdsApplicable" style={{ fontSize: 13, color: "#4a4d5c", cursor: "pointer" }}>TDS applicable</label>
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
