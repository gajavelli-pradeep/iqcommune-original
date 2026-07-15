"use client";

import { useState } from "react";
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
import type { ConfirmationEmailOutcome } from "@/lib/email/deliver-confirmation-email";

interface PractitionerOption {
  id: string;
  name: string;
  email: string;
  status: string;
}

// The two fields we can safely pre-fill from the superseded confirmation's snapshot.
function snapshotDefaults(snapshot: ConfirmationRow["snapshot"]): { duration: string } {
  const snap = (snapshot ?? {}) as { duration?: string };
  const duration = DURATION_OPTIONS.includes(snap.duration as (typeof DURATION_OPTIONS)[number])
    ? (snap.duration as string)
    : "3 hours";
  return { duration };
}

export function ReassignConsentModal({
  open,
  onClose,
  confirmation,
  practitioners,
  onReassigned,
}: {
  open: boolean;
  onClose: () => void;
  confirmation: ConfirmationRow;
  practitioners: PractitionerOption[];
  onReassigned: (newRow: ConfirmationRow, supersededIds: string[], newPractitionerId: string) => void;
}) {
  const defaults = snapshotDefaults(confirmation.snapshot);
  const [form, setForm] = useState({
    newPractitionerId: "",
    reason: "",
    gross: String(confirmation.gross_amount),
    tdsRate: String(confirmation.tds_rate ?? 0),
    gstRate: String(confirmation.gst_rate ?? 0),
    startTime: "",
    duration: defaults.duration,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [emailStatus, setEmailStatus] = useState<ConfirmationEmailOutcome | null>(null);
  const [copied, setCopied] = useState(false);

  // Only empanelled practitioners other than the one currently on the session.
  const eligible = practitioners.filter(
    (p) => p.status === "Empanelled" && p.id !== confirmation.practitioner_id
  );

  const gross = Number(form.gross) || 0;
  const tdsRate = Number(form.tdsRate) || 0;
  const gstRate = Number(form.gstRate) || 0;
  const { net, tdsAmount, gstAmount } = computeNet({ gross, tdsRate, gstRate });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.value;
      setForm((f) => ({ ...f, [k]: v }));
    };

  async function submit() {
    setError("");
    if (!form.newPractitionerId) return setError("Select the replacement practitioner.");
    if (form.reason.trim().length < 3) return setError("Enter a reason for the replacement.");
    if (gross <= 0) return setError("Enter a gross amount.");
    if (!form.startTime) return setError("Enter the session start time.");
    setSaving(true);
    let res: Response;
    try {
      res = await fetch(`/api/admin/global/sessions/${confirmation.session_id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPractitionerId: form.newPractitionerId,
          reason: form.reason.trim(),
          gross, tdsRate, gstRate,
          startTime: form.startTime,
          duration: form.duration,
        }),
      });
    } catch {
      setSaving(false);
      return setError("Network error — please try again.");
    }
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return setError(body.error ?? "Could not reassign the session.");
    }
    const { data } = (await res.json()) as {
      data: {
        confirmation: ConfirmationRow;
        supersededIds: string[];
        consent_link: string;
        newPractitionerId: string;
        emailStatus?: ConfirmationEmailOutcome;
      };
    };
    onReassigned(data.confirmation, data.supersededIds, data.newPractitionerId);
    setEmailStatus(data.emailStatus ?? null);
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

  const currentName = confirmation.practitioner?.name ?? "the current practitioner";

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Replace practitioner"
      subtitle={`Supersede ${confirmation.ref_code} and re-issue consent for a new practitioner`}
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
              {saving ? "Replacing…" : "Replace & get link"}
            </button>
          </>
        )
      }
    >
      {generatedLink ? (
        <div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
            Reassigned. {currentName}&apos;s confirmation is now <strong>Superseded</strong>.{" "}
            {emailStatus === "failed"
              ? "The consent email couldn't be sent — share the link below with the new practitioner."
              : emailStatus === "no_email"
                ? "The new practitioner has no email on file — share the link below with them."
                : "A fresh confirmation was sent to the new practitioner; delivery isn't confirmed, so share the link below if it doesn't arrive."}
          </div>
          <div
            style={{
              display: "flex", gap: 8, alignItems: "center",
              background: "var(--surface-soft)", border: "1px solid var(--border-input)",
              borderRadius: 8, padding: "8px 10px",
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
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--ink-soft)", background: "var(--surface-soft)", borderRadius: 6, padding: "8px 10px", lineHeight: 1.6 }}>
            Session <strong>{confirmation.session_ref}</strong> · currently <strong>{currentName}</strong>.
            Replacing supersedes their consent and resets the session to <em>Pending consent</em> for the new practitioner.
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <span style={fieldLabelStyle}>Replacement practitioner *</span>
              <select style={fieldSelectStyle} value={form.newPractitionerId} onChange={set("newPractitionerId")}>
                <option value="">{eligible.length ? "— select empanelled practitioner —" : "No other empanelled practitioners"}</option>
                {eligible.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} · {p.email}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <span style={fieldLabelStyle}>Reason for replacement *</span>
              <textarea
                rows={2}
                style={{ ...fieldInputStyle, resize: "vertical" }}
                placeholder="e.g. Original practitioner unavailable"
                value={form.reason}
                onChange={set("reason")}
              />
            </label>
          </div>

          <label>
            <span style={fieldLabelStyle}>Start time *</span>
            <input type="time" style={fieldInputStyle} value={form.startTime} onChange={set("startTime")} />
          </label>
          <label>
            <span style={fieldLabelStyle}>Duration *</span>
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
