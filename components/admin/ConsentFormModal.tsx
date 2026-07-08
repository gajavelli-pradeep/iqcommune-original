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
  const empty = { sessionId: "", gross: "", tdsRate: "", gstRate: "" };
  const [form, setForm] = useState(empty);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  // Parent remounts this modal on open (via `key`), so state starts fresh each time —
  // loading begins true and the fetch effect only writes state from async callbacks.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

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

  const eligible = sessions.filter(
    (s) => s.status === "Upcoming" && s.consent_status === "Pending consent" && !confirmedSessionIds.includes(s.id)
  );
  const selected = eligible.find((s) => s.id === form.sessionId) ?? null;

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
    setSaving(true);
    let res: Response;
    try {
      res = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selected.id, gross, tdsRate, gstRate }),
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
      title="Generate session consent"
      subtitle="Create the revenue confirmation and practitioner consent link"
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
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--ink-soft)", background: "var(--surface-soft)", borderRadius: 6, padding: "6px 10px" }}>
              Practitioner: <strong>{selected.practitioner?.name ?? "Unknown"}</strong> · {selected.participants} pax · {selected.venue}
            </div>
          )}

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
