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
import { computeNet } from "@/lib/consent";
import { DURATION_OPTIONS } from "@/lib/schemas/consent";
import type { ConfirmationRow } from "@/components/admin/ConsentTable";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";

// V5 duration labels (values stay the schema enum "3 hours" / "6 hours").
const DURATION_LABELS: Record<string, string> = {
  "3 hours": "3 hours — single module",
  "6 hours": "6 hours — bundled, two modules",
};
// V5 "Start time" pickers: hour 1–12, minute 00/15/30/45, AM/PM.
const HOUR_OPTIONS = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

interface SessionOption {
  id: string;
  ref_code: string;
  module: string;
  session_date: string | null;
  start_time: string;
  end_time: string;
  venue: string;
  participants: number;
  payout_amount: number;
  consent_status: string;
  status: string;
  practitioner_id: string;
  practitioner: { name: string; email: string } | null;
}

// Mirror of the /api/admin/consent/preview payload — the fields the confirmation
// auto-populates from the request + practitioner record.
interface ConsentAutofill {
  firstName: string;
  practitionerName: string;
  module: string;
  date: string;
  venue: string;
  city: string;
  state: string;
  audience: string;
  participants: number;
  spoc: string;
  agreementRef: string;
  agreementId: string | null;
  invoiceBy: string;
  paymentMethod: string;
  payoutAmount: number;
  sessionId: string;
  requestId: string | null;
  practitionerId: string;
  dateRaw: string | null;
}

export function ConsentFormModal({
  open = true,
  onClose,
  onCreated,
  confirmedSessionIds,
  inline = false,
  isGlobalAdmin = false,
}: {
  open?: boolean;
  onClose?: () => void;
  onCreated: (c: ConfirmationRow) => void;
  confirmedSessionIds: string[];
  /** Render the form directly on the page (V5 Session Consent tab) instead of in a modal. */
  inline?: boolean;
  /** V5: Global Admin may correct auto-populated fields on the underlying source record. */
  isGlobalAdmin?: boolean;
}) {
  // V5 defaults: TDS 10%, GST 18%. Start time captured via hour/minute/AM-PM.
  const empty = { sessionId: "", gross: "", tdsRate: "10", gstRate: "18", startHour: "", startMinute: "00", startAmpm: "AM", duration: "3 hours" };
  const [form, setForm] = useState(empty);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  // Parent remounts this modal on open (via `key`), so state starts fresh each time —
  // loading begins true and the fetch effect only writes state from async callbacks.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  // Whether the consent email reached the practitioner ('sent'|'delivered'|'failed'
  // |'bounced'|'no_email') — drives the post-generate guidance so we never falsely
  // claim an email was sent.
  const [emailStatus, setEmailStatus] = useState("");
  const [copied, setCopied] = useState(false);
  // Op-procedure Part 4: after Generate the admin can download the consent PDF
  // (C4) and open a pre-filled draft email with the consent link (C5).
  const [generatedId, setGeneratedId] = useState("");
  const [generatedRecipient, setGeneratedRecipient] = useState<{ name?: string; email?: string }>({});
  const [draftOpen, setDraftOpen] = useState(false);
  // Keyed by session id so a stale fetch (from a previously-picked session) is never
  // shown against the current one — the render derives from this + form.sessionId.
  const [autofill, setAutofill] = useState<{ sessionId: string; data: ConsentAutofill } | null>(null);

  // V5: Global-Admin per-field correction. Editing one auto-populated field PATCHes the
  // underlying source record (session / request / practitioner) so the fix is permanent,
  // then optimistically updates the on-screen autofill.
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [fieldSaving, setFieldSaving] = useState(false);

  async function saveField(
    route: string,
    body: Record<string, unknown>,
    applied: Partial<ConsentAutofill>,
  ) {
    setFieldSaving(true);
    setError("");
    try {
      const res = await fetch(route, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not save the correction.");
        return;
      }
      setAutofill((prev) => (prev ? { ...prev, data: { ...prev.data, ...applied } } : prev));
      setEditingField(null);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setFieldSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then(({ data }) => { if (!cancelled) setSessions((data as SessionOption[]) ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  // Pull the auto-populated fields for the picked session, so the admin reviews
  // exactly what the confirmation will carry before generating it. Only ever writes
  // state from async callbacks (never synchronously in the effect body).
  useEffect(() => {
    const sid = form.sessionId;
    if (!sid) return;
    let cancelled = false;
    fetch(`/api/admin/consent/preview?sessionId=${encodeURIComponent(sid)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ data }) => { if (!cancelled) setAutofill({ sessionId: sid, data: data as ConsentAutofill }); })
      .catch(() => { if (!cancelled) setAutofill((prev) => (prev?.sessionId === sid ? null : prev)); });
    return () => { cancelled = true; };
  }, [form.sessionId]);

  const eligible = sessions.filter(
    (s) => s.status === "Upcoming" && s.consent_status === "Pending consent" && !confirmedSessionIds.includes(s.id)
  );
  const selected = eligible.find((s) => s.id === form.sessionId) ?? null;
  // Auto-populated fields, but only when they belong to the currently-picked session.
  const af = autofill && autofill.sessionId === form.sessionId ? autofill.data : null;

  const gross = Number(form.gross) || 0;
  const tdsRate = Number(form.tdsRate) || 0;
  const gstRate = Number(form.gstRate) || 0;
  const { net } = computeNet({ gross, tdsRate, gstRate });

  // Compose the three V5 time pickers into the 24h HH:MM the consent API requires.
  const startTime = form.startHour
    ? (() => {
        let h = parseInt(form.startHour, 10);
        if (form.startAmpm === "PM" && h !== 12) h += 12;
        if (form.startAmpm === "AM" && h === 12) h = 0;
        return `${String(h).padStart(2, "0")}:${form.startMinute}`;
      })()
    : "";

  const set =
    (k: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      setForm((f) => {
        const next = { ...f, [k]: v };
        // Prefill gross with the session's agreed payout when a session is picked.
        if (k === "sessionId") {
          const s = eligible.find((x) => x.id === v);
          if (s && !f.gross) next.gross = String(s.payout_amount);
        }
        return next;
      });
    };

  async function submit() {
    setError("");
    if (!selected) return setError("Select an eligible session.");
    if (gross <= 0) return setError("Enter a gross amount.");
    if (!form.startHour) return setError("Enter the session start time.");
    setSaving(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selected.id, gross, tdsRate, gstRate, startTime, duration: form.duration }),
      });
    } catch {
      setSaving(false);
      return setError("Network error — please try again.");
    }
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return setError(body.error ?? "Could not generate confirmation.");
    }
    const { data } = (await res.json()) as {
      data: { id: string; ref_code: string; consent_link: string; net: number; emailStatus?: string };
    };
    const nowIso = new Date().toISOString();
    const emailState = data.emailStatus ?? "sent";
    onCreated({
      id: data.id,
      ref_code: data.ref_code,
      session_id: selected.id,
      practitioner_id: selected.practitioner_id,
      session_ref: selected.ref_code,
      gross_amount: gross,
      tds_rate: tdsRate,
      gst_rate: gstRate,
      net_amount: data.net,
      snapshot: {},
      consent_link: data.consent_link,
      signed_at: null,
      signature_method: null,
      signature_data: null,
      signer_ip: null,
      storage_path: null,
      status: "Awaiting consent",
      email_status: emailState,
      email_last_attempt_at: emailState === "no_email" ? null : nowIso,
      issued_on: nowIso,
      created_at: nowIso,
      updated_at: null,
      deleted_at: null,
      practitioner: selected.practitioner
        ? { name: selected.practitioner.name, email: selected.practitioner.email }
        : null,
    });
    setGeneratedLink(data.consent_link);
    setGeneratedId(data.id);
    setGeneratedRecipient({ name: selected.practitioner?.name, email: selected.practitioner?.email });
    setEmailStatus(emailState);
  }

  // C4: stream the consent PDF that was generated + stored at generate-time.
  async function downloadPdf() {
    if (!generatedId) return;
    try {
      const r = await fetch(`/api/admin/consent/${generatedId}/download`);
      if (!r.ok) return;
      const { url } = (await r.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* download unavailable — the consent link above is still copyable */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is visible for manual copy */
    }
  }

  // Inline mode has no modal to close — reset the form so the admin can generate another.
  function reset() {
    setForm(empty);
    setAutofill(null);
    setGeneratedLink("");
    setGeneratedId("");
    setGeneratedRecipient({});
    setDraftOpen(false);
    setEmailStatus("");
    setCopied(false);
  }

  const title = "Generate a new confirmation";
  const subtitle = "All fields below flow from the original Session Request and Practitioner onboarding record. Global Admin can correct any field on the underlying record.";
  const footer = generatedLink ? (
    inline
      ? <button type="button" style={primaryBtn} onClick={reset}>Generate another</button>
      : <button type="button" style={primaryBtn} onClick={onClose}>Done</button>
  ) : (
    <>
      {!inline && <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>}
      {/* V5: the submit only appears once a session is selected. */}
      {selected && (
        <button
          type="button"
          style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
          disabled={saving}
          onClick={submit}
        >
          {saving ? "Generating…" : "Generate & send for consent"}
        </button>
      )}
    </>
  );

  const body = (
    <>
      {generatedLink ? (
        <div>
          {emailStatus === "failed" || emailStatus === "bounced" ? (
            <div style={{ fontSize: 13, color: "var(--amber)", background: "var(--amber-light)", border: "1px solid var(--amber-f)", borderRadius: 8, padding: "9px 11px", marginBottom: 10 }}>
              Confirmation generated, but we <strong>couldn&apos;t email the practitioner</strong>. Copy the consent link below and send it to them directly (WhatsApp / email).
            </div>
          ) : emailStatus === "no_email" ? (
            <div style={{ fontSize: 13, color: "var(--ink-muted)", background: "var(--surface-sunken)", borderRadius: 8, padding: "9px 11px", marginBottom: 10 }}>
              Confirmation generated. <strong>No email is on file</strong> for this practitioner — copy the consent link below and send it manually.
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
              Confirmation generated and the consent email was sent to the practitioner — you can also copy the consent link and send it yourself:
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "var(--surface-soft)",
              border: "1px solid var(--border-input)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <input readOnly value={generatedLink} style={{ ...fieldInputStyle, border: "none", background: "transparent", padding: 0 }} />
            <button type="button" style={{ ...ghostBtn, flexShrink: 0 }} onClick={copyLink}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={{ ...ghostBtn, flexShrink: 0 }} onClick={downloadPdf}>Download PDF</button>
            <button type="button" style={{ ...ghostBtn, flexShrink: 0 }} onClick={() => setDraftOpen(true)}>Draft email</button>
          </div>
          <ContactDraftModal
            open={draftOpen}
            onClose={() => setDraftOpen(false)}
            recipientName={generatedRecipient.name}
            recipientEmail={generatedRecipient.email}
            subject="Please review & sign your session consent"
            emailBody={`Dear ${generatedRecipient.name ?? "Practitioner"},\n\nPlease review and sign your session consent form:\n${generatedLink}\n\nWarm regards,\nThe iqcommune Team`}
            waBody={`Hi ${generatedRecipient.name ?? ""}! Please review & sign your session consent form:\n${generatedLink}`}
            title="Draft consent email"
            subtitle="Pre-filled - copy and send via your preferred channel"
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <span style={fieldLabelStyle}>Select session awaiting consent</span>
              <select style={fieldSelectStyle} value={form.sessionId} onChange={set("sessionId")}>
                <option value="">
                  {loading ? "Loading sessions…" : eligible.length ? "— select session —" : "No eligible sessions"}
                </option>
                {eligible.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ref_code} · {s.module} · {s.session_date ?? ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selected && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "2px 0 8px" }}>
                Auto-populated — from the request and practitioner record
              </div>
              {!af ? (
                <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading details…</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem 1rem", background: "var(--surface-soft)", borderRadius: 8, padding: "10px 12px" }}>
                  {(() => {
                    // V5: each auto-populated field maps to its underlying source record; the
                    // Global-Admin pencil PATCHes that record (permanent), then updates `af`.
                    const sess = `/api/admin/global/sessions/${af.sessionId}`;
                    const req = af.requestId ? `/api/admin/global/requests/${af.requestId}` : null;
                    const pract = `/api/admin/global/practitioners/${af.practitionerId}`;
                    const fmtDate = (v: string) =>
                      v ? new Date(v + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
                    type Edit = { route: string; type: "text" | "date" | "number"; seed: string; body: (v: string) => Record<string, unknown>; apply: (v: string) => Partial<ConsentAutofill> };
                    const rows: { label: string; value: string; edit: Edit | null }[] = [
                      { label: "First name", value: af.firstName, edit: { route: pract, type: "text", seed: af.practitionerName, body: (v) => ({ name: v }), apply: (v) => ({ practitionerName: v, firstName: v.split(" ")[0] || v }) } },
                      { label: "Module confirmed for", value: af.module, edit: { route: sess, type: "text", seed: af.module, body: (v) => ({ module: v }), apply: (v) => ({ module: v }) } },
                      { label: "Date", value: af.date, edit: { route: sess, type: "date", seed: af.dateRaw ?? "", body: (v) => ({ session_date: v }), apply: (v) => ({ date: fmtDate(v), dateRaw: v }) } },
                      { label: "Venue", value: af.venue, edit: { route: sess, type: "text", seed: af.venue, body: (v) => ({ venue: v }), apply: (v) => ({ venue: v }) } },
                      { label: "City", value: af.city || "—", edit: req ? { route: req, type: "text", seed: af.city, body: (v) => ({ city: v }), apply: (v) => ({ city: v }) } : null },
                      { label: "State", value: af.state || "—", edit: req ? { route: req, type: "text", seed: af.state, body: (v) => ({ state: v }), apply: (v) => ({ state: v }) } : null },
                      { label: "Audience type", value: af.audience, edit: { route: sess, type: "text", seed: af.audience, body: (v) => ({ audience_type: v }), apply: (v) => ({ audience: v }) } },
                      { label: "Participant count", value: String(af.participants), edit: { route: sess, type: "number", seed: String(af.participants), body: (v) => ({ participants: Number(v) || 0 }), apply: (v) => ({ participants: Number(v) || 0 }) } },
                      { label: "SPOC name", value: af.spoc, edit: req ? { route: req, type: "text", seed: af.spoc, body: (v) => ({ name: v }), apply: (v) => ({ spoc: v }) } : null },
                      // V5: every auto-populated field is Global-Admin correctable.
                      // Agreement ref → the Active agreement's ref_code (only when one
                      // exists); invoice-by → the practitioner's family/payee name.
                      { label: "Empanelment agreement ref.", value: af.agreementRef, edit: af.agreementId ? { route: `/api/admin/global/agreements/${af.agreementId}`, type: "text", seed: af.agreementRef === "—" ? "" : af.agreementRef, body: (v) => ({ ref_code: v }), apply: (v) => ({ agreementRef: v }) } : null },
                      { label: "Invoice should be raised by", value: af.invoiceBy, edit: { route: pract, type: "text", seed: af.invoiceBy, body: (v) => ({ family_name: v, pay_to_family: true }), apply: (v) => ({ invoiceBy: v }) } },
                      { label: "Payment method on file", value: af.paymentMethod, edit: { route: pract, type: "text", seed: af.paymentMethod === "—" ? "" : af.paymentMethod, body: (v) => ({ upi_id: v }), apply: (v) => ({ paymentMethod: v || "—" }) } },
                    ];
                    return rows.map(({ label, value, edit }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 1, display: "flex", alignItems: "center", gap: 5 }}>
                          {label}
                          {isGlobalAdmin && edit && editingField !== label && (
                            <button
                              type="button"
                              onClick={() => { setEditingField(label); setFieldDraft(edit.seed); setError(""); }}
                              title="Global Admin: correct the source record"
                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--gold-dark)", display: "inline-flex", lineHeight: 0 }}
                            >
                              <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                            </button>
                          )}
                        </div>
                        {isGlobalAdmin && edit && editingField === label ? (
                          <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 2 }}>
                            <input
                              type={edit.type}
                              value={fieldDraft}
                              autoFocus
                              onChange={(e) => setFieldDraft(e.target.value)}
                              style={{ ...fieldInputStyle, padding: "5px 7px", fontSize: 12 }}
                            />
                            <button type="button" disabled={fieldSaving} onClick={() => saveField(edit.route, edit.body(fieldDraft), edit.apply(fieldDraft))} title="Save" style={{ background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: fieldSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{fieldSaving ? "…" : "Save"}</button>
                            <button type="button" onClick={() => setEditingField(null)} title="Cancel" style={{ background: "none", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: "var(--ink-soft)" }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, overflowWrap: "anywhere" }}>{value}</div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}

          {/* V5: the admin-entry + financial fields only appear once a session is
              picked (the mockup's conf-auto-wrap is hidden until then). */}
          {selected && (
            <>
              <label>
                <span style={fieldLabelStyle}>Start time <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(admin enters)</span></span>
                <div style={{ display: "flex", gap: 6 }}>
                  <select style={fieldSelectStyle} value={form.startHour} onChange={set("startHour")} aria-label="Start hour">
                    <option value="">Hr</option>
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select style={fieldSelectStyle} value={form.startMinute} onChange={set("startMinute")} aria-label="Start minute">
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select style={fieldSelectStyle} value={form.startAmpm} onChange={set("startAmpm")} aria-label="AM or PM">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </label>
              <label>
                <span style={fieldLabelStyle}>Duration <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(admin enters)</span></span>
                <select style={fieldSelectStyle} value={form.duration} onChange={set("duration")}>
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{DURATION_LABELS[d] ?? d}</option>
                  ))}
                </select>
              </label>

              <label>
                <span style={fieldLabelStyle}>Gross amount (₹)</span>
                <input type="number" min={1} style={fieldInputStyle} value={form.gross} onChange={set("gross")} />
              </label>
              <label>
                <span style={fieldLabelStyle}>TDS %</span>
                <input type="number" min={0} max={100} placeholder="0" style={fieldInputStyle} value={form.tdsRate} onChange={set("tdsRate")} />
              </label>
              <label>
                <span style={fieldLabelStyle}>GST %</span>
                <input type="number" min={0} max={100} placeholder="0" style={fieldInputStyle} value={form.gstRate} onChange={set("gstRate")} />
              </label>
            </>
          )}

          {selected && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--green-light)", borderRadius: 8, padding: "12px 14px" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Net payout amount</div>
                <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>Gross × (1 − TDS% + GST%)</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "var(--green)" }}>₹{net.toLocaleString("en-IN")}</div>
            </div>
          )}

          {error && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--red)" }}>{error}</div>}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div style={{ border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, background: "var(--surface)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 }}>{subtitle}</div>
        {body}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>{footer}</div>
      </div>
    );
  }

  return (
    <FormModal open={open} onClose={onClose ?? (() => {})} title={title} subtitle={subtitle} footer={footer}>
      {body}
    </FormModal>
  );
}
