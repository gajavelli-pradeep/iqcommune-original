"use client";

import { useState } from "react";
import { FormModal, fieldLabelStyle, fieldInputStyle, fieldSelectStyle, primaryBtn, ghostBtn } from "@/components/admin/FormModal";
import type { Database } from "@/lib/supabase/database.types";

export type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};

const STATUSES = ["New", "Matched", "Confirmed", "Completed", "Cancelled"] as const;

const EMPTY = {
  name: "", email: "", phone: "", org: "", city: "", state: "",
  topic: "", audienceType: "", groupSize: "", minCommit: "",
  venue: "", preferredDates: "", notes: "", status: "New",
};

function fromRecord(r: RequestRow): typeof EMPTY {
  return {
    name:           r.name ?? "",
    email:          r.email ?? "",
    phone:          r.phone ?? "",
    org:            r.org ?? "",
    city:           r.city ?? "",
    state:          r.state ?? "",
    topic:          r.topic ?? "",
    audienceType:   r.audience_type ?? "",
    groupSize:      r.group_size ?? "",
    minCommit:      r.min_commit != null ? String(r.min_commit) : "",
    venue:          r.venue ?? "",
    preferredDates: r.preferred_dates ?? "",
    notes:          r.notes ?? "",
    status:         r.status ?? "New",
  };
}

export function RequestFormModal({
  open,
  onClose,
  onCreated,
  initialData = null,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (r: RequestRow) => void;
  /** When set, the modal switches to edit mode (Global Admin only). */
  initialData?: RequestRow | null;
  onUpdated?: (r: RequestRow) => void;
}) {
  const isEdit = !!initialData;
  const [form, setForm] = useState(() => (initialData ? fromRecord(initialData) : EMPTY));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    if (!form.name || !form.email || !form.topic || !form.audienceType) {
      setError("Name, email, topic and audience type are required.");
      return;
    }
    setSaving(true);

    let res: Response;
    try {
      res = isEdit
        ? await fetch(`/api/admin/global/requests/${initialData!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name:            form.name,
              email:           form.email,
              phone:           form.phone || null,
              org:             form.org || null,
              city:            form.city || null,
              state:           form.state || null,
              topic:           form.topic,
              audience_type:   form.audienceType,
              group_size:      form.groupSize || null,
              min_commit:      form.minCommit ? Number(form.minCommit) : null,
              venue:           form.venue || null,
              preferred_dates: form.preferredDates || null,
              notes:           form.notes || null,
              status:          form.status,
            }),
          })
        : await fetch("/api/admin/session-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name:           form.name,
              email:          form.email,
              phone:          form.phone || undefined,
              org:            form.org || undefined,
              city:           form.city || undefined,
              state:          form.state || undefined,
              topic:          form.topic,
              audienceType:   form.audienceType,
              groupSize:      form.groupSize || undefined,
              minCommit:      form.minCommit ? Number(form.minCommit) : undefined,
              venue:          form.venue || undefined,
              preferredDates: form.preferredDates || undefined,
              notes:          form.notes || undefined,
              status:         form.status,
            }),
          });
    } catch {
      setSaving(false);
      setError("Network error — please try again.");
      return;
    }
    setSaving(false);
    if (!res.ok) { setError(`Could not ${isEdit ? "save changes" : "add request"}. Check the fields and try again.`); return; }

    if (isEdit) {
      onUpdated?.({
        ...initialData!,
        name: form.name, email: form.email, phone: form.phone || null, org: form.org || null,
        city: form.city || null, state: form.state || null, topic: form.topic,
        audience_type: form.audienceType, group_size: form.groupSize || null,
        min_commit: form.minCommit ? Number(form.minCommit) : null, venue: form.venue || null,
        preferred_dates: form.preferredDates || null, notes: form.notes || null, status: form.status,
      });
    } else {
      const { data } = await res.json();
      onCreated(data as RequestRow);
      setForm(EMPTY);
    }
    onClose();
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit request" : "Add request"}
      subtitle={isEdit ? "Update this session request" : "Log a session request on behalf of a client"}
      footer={
        <>
          <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add request"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
        <Field label="Name *"><input id="rf-name" name="rf-name" style={fieldInputStyle} value={form.name} onChange={set("name")} /></Field>
        <Field label="Email *"><input id="rf-email" name="rf-email" type="email" style={fieldInputStyle} value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone"><input id="rf-phone" name="rf-phone" style={fieldInputStyle} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Organisation"><input id="rf-org" name="rf-org" style={fieldInputStyle} value={form.org} onChange={set("org")} /></Field>
        <Field label="City"><input id="rf-city" name="rf-city" style={fieldInputStyle} value={form.city} onChange={set("city")} /></Field>
        <Field label="State"><input id="rf-state" name="rf-state" style={fieldInputStyle} value={form.state} onChange={set("state")} /></Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Topic *"><input id="rf-topic" name="rf-topic" style={fieldInputStyle} value={form.topic} onChange={set("topic")} /></Field>
        </div>
        <Field label="Audience type *"><input id="rf-audience" name="rf-audience" style={fieldInputStyle} placeholder="e.g. Groups / 1-on-1" value={form.audienceType} onChange={set("audienceType")} /></Field>
        <Field label="Group size"><input id="rf-group" name="rf-group" style={fieldInputStyle} value={form.groupSize} onChange={set("groupSize")} /></Field>
        <Field label="Min. commitment"><input id="rf-commit" name="rf-commit" type="number" min={0} style={fieldInputStyle} value={form.minCommit} onChange={set("minCommit")} /></Field>
        <Field label="Venue"><input id="rf-venue" name="rf-venue" style={fieldInputStyle} value={form.venue} onChange={set("venue")} /></Field>
        <Field label="Preferred dates"><input id="rf-dates" name="rf-dates" style={fieldInputStyle} value={form.preferredDates} onChange={set("preferredDates")} /></Field>
        <Field label="Status">
          <select id="rf-status" name="rf-status" style={fieldSelectStyle} value={form.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Notes"><textarea id="rf-notes" name="rf-notes" rows={2} style={{ ...fieldInputStyle, resize: "vertical" }} value={form.notes} onChange={set("notes")} /></Field>
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
