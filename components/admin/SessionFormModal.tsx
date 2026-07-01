"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, fieldSelectStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";

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
  updated_at: string | null;
  deleted_at: string | null;
  practitioner: { name: string; email: string } | null;
  payout_id?: string | null;
}

const EMPTY = { refCode: "", module: "", practitionerId: "", sessionDate: "", startTime: "", endTime: "", venue: "", audienceType: "", participants: "", payoutAmount: "", tdsApplicable: false, tdsRate: "10" };

function fromSession(s: NewSession): typeof EMPTY {
  return {
    refCode:        s.ref_code ?? "",
    module:         s.module ?? "",
    practitionerId: s.practitioner_id ?? "",
    sessionDate:    s.session_date ?? "",
    startTime:      s.start_time ?? "",
    endTime:        s.end_time ?? "",
    venue:          s.venue ?? "",
    audienceType:   s.audience_type ?? "",
    participants:   s.participants != null ? String(s.participants) : "",
    payoutAmount:   s.payout_amount != null ? String(s.payout_amount) : "",
    tdsApplicable:  !!s.tds_applicable,
    tdsRate:        s.tds_rate != null ? String(s.tds_rate) : "10",
  };
}

export function SessionFormModal({
  open,
  onClose,
  practitioners,
  onCreated,
  initialData = null,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  practitioners: PractitionerOption[];
  onCreated: (s: NewSession) => void;
  /** When set, the modal switches to edit mode (Super Admin only). */
  initialData?: NewSession | null;
  onUpdated?: (s: NewSession) => void;
}) {
  const isEdit = !!initialData;
  const eligible = practitioners.filter((p) => p.status === "Empanelled");

  // In edit mode the session's current practitioner must remain selectable even
  // if their status is no longer "Empanelled", or the form couldn't save.
  const options: PractitionerOption[] = (() => {
    if (isEdit && initialData!.practitioner_id && !eligible.some((p) => p.id === initialData!.practitioner_id)) {
      return [
        { id: initialData!.practitioner_id, name: initialData!.practitioner?.name ?? "(current practitioner)", email: initialData!.practitioner?.email ?? "", status: "" },
        ...eligible,
      ];
    }
    return eligible;
  })();

  // Lazy initializer seeds from the record on mount. Edit instances are mounted
  // fresh per record (see the `key` at the call site), so no prop-sync effect is
  // needed — which also keeps this clear of react-hooks/set-state-in-effect.
  const [form, setForm] = useState(() => (initialData ? fromSession(initialData) : EMPTY));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "tdsApplicable" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function submit() {
    setError("");
    const required = [form.refCode, form.module, form.practitionerId, form.sessionDate, form.startTime, form.endTime, form.venue, form.audienceType, form.participants, form.payoutAmount];
    if (required.some((v) => !v)) { setError("All fields except TDS are required."); return; }

    setSaving(true);
    let res: Response;
    try {
      res = isEdit
        ? await fetch(`/api/admin/super/sessions/${initialData!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ref_code:        form.refCode,
              module:          form.module,
              practitioner_id: form.practitionerId,
              session_date:   form.sessionDate,
              start_time:     form.startTime,
              end_time:       form.endTime,
              venue:          form.venue,
              audience_type:  form.audienceType,
              participants:   Number(form.participants),
              payout_amount:  Number(form.payoutAmount),
              tds_applicable: form.tdsApplicable,
              tds_rate:       form.tdsApplicable ? Number(form.tdsRate) : null,
            }),
          })
        : await fetch("/api/admin/sessions", {
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
    } catch {
      setSaving(false);
      setError("Network error — please try again.");
      return;
    }
    setSaving(false);
    if (!res.ok) { setError(`Could not ${isEdit ? "save changes" : "create session"}. Check the fields and try again.`); return; }

    const pr = options.find((p) => p.id === form.practitionerId);
    const base: NewSession = {
      id: isEdit ? initialData!.id : (await res.json()).id,
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
      consent_status: isEdit ? initialData!.consent_status : "Pending consent",
      status: isEdit ? initialData!.status : "Upcoming",
      request_id: isEdit ? initialData!.request_id : null,
      created_at: isEdit ? initialData!.created_at : new Date().toISOString(),
      updated_at: isEdit ? new Date().toISOString() : null,
      deleted_at: isEdit ? initialData!.deleted_at : null,
      practitioner: pr ? { name: pr.name, email: pr.email } : (isEdit ? initialData!.practitioner : null),
      payout_id: isEdit ? initialData!.payout_id ?? null : null,
    };

    if (isEdit) onUpdated?.(base);
    else onCreated(base);
    if (!isEdit) setForm(EMPTY);
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit session" : "Create session"}
      subtitle={isEdit ? "Update this session's details" : "Schedule a new session for an empanelled practitioner"}
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...primaryBtn, background: "#c9982a", color: "#14161d", fontWeight: 600, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create session"}
          </button>
        </>
      }
    >
      {!isEdit && eligible.length === 0 && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#854f0b", background: "#faeeda", border: "1px solid #fac775", borderRadius: 8, padding: "8px 12px" }}>
          No empanelled practitioners yet — empanel a practitioner before creating sessions.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <Field label="Reference code"><input id="sf-ref-code" name="sf-ref-code" style={fieldInputStyle} placeholder="IQC-SES-0003" value={form.refCode} onChange={set("refCode")} /></Field>
        <Field label="Module"><input id="sf-module" name="sf-module" style={fieldInputStyle} value={form.module} onChange={set("module")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Practitioner">
            <select id="sf-practitioner" name="sf-practitioner" style={fieldSelectStyle} value={form.practitionerId} onChange={set("practitionerId")}>
              <option value="">— select practitioner —</option>
              {options.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Date"><input id="sf-date" name="sf-date" type="date" style={fieldInputStyle} value={form.sessionDate} onChange={set("sessionDate")} /></Field>
        <Field label="Venue"><input id="sf-venue" name="sf-venue" style={fieldInputStyle} value={form.venue} onChange={set("venue")} /></Field>
        <Field label="Start time"><input id="sf-start-time" name="sf-start-time" type="time" style={fieldInputStyle} value={form.startTime} onChange={set("startTime")} /></Field>
        <Field label="End time"><input id="sf-end-time" name="sf-end-time" type="time" style={fieldInputStyle} value={form.endTime} onChange={set("endTime")} /></Field>
        <Field label="Audience type"><input id="sf-audience-type" name="sf-audience-type" style={fieldInputStyle} value={form.audienceType} onChange={set("audienceType")} /></Field>
        <Field label="Participants"><input id="sf-participants" name="sf-participants" type="number" min={1} style={fieldInputStyle} value={form.participants} onChange={set("participants")} /></Field>
        <Field label="Payout amount (₹)"><input id="sf-payout-amount" name="sf-payout-amount" type="number" min={1} style={fieldInputStyle} value={form.payoutAmount} onChange={set("payoutAmount")} /></Field>
        <Field label="TDS rate (%)">
          <input id="sf-tds-rate" name="sf-tds-rate" type="number" min={0} max={100} style={{ ...fieldInputStyle, opacity: form.tdsApplicable ? 1 : 0.5 }} disabled={!form.tdsApplicable} value={form.tdsRate} onChange={set("tdsRate")} />
        </Field>
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
          <input id="tdsApplicable" type="checkbox" checked={form.tdsApplicable} onChange={set("tdsApplicable")} style={{ cursor: "pointer" }} />
          <label htmlFor="tdsApplicable" style={{ fontSize: 13, color: "var(--ink-soft)", cursor: "pointer" }}>TDS applicable</label>
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
