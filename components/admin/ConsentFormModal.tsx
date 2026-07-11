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
  invoiceBy: string;
  paymentMethod: string;
  payoutAmount: number;
}

export function ConsentFormModal({
  open,
  onClose,
  onCreated,
  confirmedSessionIds,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: ConfirmationRow) => void;
  confirmedSessionIds: string[];
}) {
  const empty = { sessionId: "", gross: "", tdsRate: "", gstRate: "", startTime: "", duration: "3 hours" };
  const [form, setForm] = useState(empty);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  // Parent remounts this modal on open (via `key`), so state starts fresh each time —
  // loading begins true and the fetch effect only writes state from async callbacks.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  // Keyed by session id so a stale fetch (from a previously-picked session) is never
  // shown against the current one — the render derives from this + form.sessionId.
  const [autofill, setAutofill] = useState<{ sessionId: string; data: ConsentAutofill } | null>(null);

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
  const { net, tdsAmount, gstAmount } = computeNet({ gross, tdsRate, gstRate });

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
    if (!form.startTime) return setError("Enter the session start time.");
    setSaving(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selected.id, gross, tdsRate, gstRate, startTime: form.startTime, duration: form.duration }),
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
      data: { id: string; ref_code: string; consent_link: string; net: number };
    };
    const nowIso = new Date().toISOString();
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
      issued_on: nowIso,
      created_at: nowIso,
      updated_at: null,
      deleted_at: null,
      practitioner: selected.practitioner
        ? { name: selected.practitioner.name, email: selected.practitioner.email }
        : null,
    });
    setGeneratedLink(data.consent_link);
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

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Generate a new confirmation"
      subtitle="All fields below flow from the original Session Request and Practitioner onboarding record."
      footer={
        generatedLink ? (
          <button type="button" style={primaryBtn} onClick={onClose}>Done</button>
        ) : (
          <>
            <button type="button" style={ghostBtn} onClick={onClose}>Cancel</button>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
              disabled={saving}
              onClick={submit}
            >
              {saving ? "Generating…" : "Generate & get link"}
            </button>
          </>
        )
      }
    >
      {generatedLink ? (
        <div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
            Confirmation generated. An email was sent to the practitioner — you can also copy the consent link and send it yourself:
          </div>
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
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem 1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <span style={fieldLabelStyle}>Session *</span>
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
                  {([
                    ["First name", af.firstName],
                    ["Module confirmed for", af.module],
                    ["Date", af.date],
                    ["Venue", af.venue],
                    ["City", af.city || "—"],
                    ["State", af.state || "—"],
                    ["Audience type", af.audience],
                    ["Participant count", String(af.participants)],
                    ["SPOC name", af.spoc],
                    ["Empanelment agreement ref.", af.agreementRef],
                    ["Invoice should be raised by", af.invoiceBy],
                    ["Payment method on file", af.paymentMethod],
                  ] as const).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 1 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, overflowWrap: "anywhere" }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label>
            <span style={fieldLabelStyle}>Start time * <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(admin enters)</span></span>
            <input type="time" style={fieldInputStyle} value={form.startTime} onChange={set("startTime")} />
          </label>
          <label>
            <span style={fieldLabelStyle}>Duration * <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(admin enters)</span></span>
            <select style={fieldSelectStyle} value={form.duration} onChange={set("duration")}>
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label>
            <span style={fieldLabelStyle}>Gross amount (₹) *</span>
            <input type="number" min={1} style={fieldInputStyle} value={form.gross} onChange={set("gross")} />
          </label>
          <label>
            <span style={fieldLabelStyle}>TDS rate (%)</span>
            <input type="number" min={0} max={100} placeholder="0" style={fieldInputStyle} value={form.tdsRate} onChange={set("tdsRate")} />
          </label>
          <label>
            <span style={fieldLabelStyle}>GST rate (%)</span>
            <input type="number" min={0} max={100} placeholder="0" style={fieldInputStyle} value={form.gstRate} onChange={set("gstRate")} />
          </label>

          {gross > 0 && (
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--ink-soft)", background: "var(--surface-soft)", borderRadius: 6, padding: "8px 10px", lineHeight: 1.7 }}>
              Net payout: <strong>₹{net.toLocaleString("en-IN")}</strong>
              <br />
              <span style={{ color: "var(--ink-faint)" }}>
                Gross ₹{gross.toLocaleString("en-IN")} − TDS ₹{tdsAmount.toLocaleString("en-IN")} + GST ₹{gstAmount.toLocaleString("en-IN")} · net = gross × (1 − TDS% + GST%)
              </span>
            </div>
          )}

          {error && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#a32d2d" }}>{error}</div>}
        </div>
      )}
    </FormModal>
  );
}
