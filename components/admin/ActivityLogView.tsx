"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";
import { roleLabel } from "@/lib/supabase/roles";
import { AdminTable, TD } from "@/components/admin/AdminTable";

interface ActivityRow {
  id: string;
  actor_email: string;
  actor_role: "admin" | "global_admin" | string;
  action: string;
  record_table: string;
  record_id: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
}

const PAGE = 50;

// Human-readable label per action key. Falls back to a de-slugged form.
const ACTION_LABEL: Record<string, string> = {
  approve_photos:            "approved photos",
  reject_photos:             "rejected photos",
  revoke_photo_approval:     "revoked photo approval",
  reopen_photos:             "reopened rejected photos",
  mark_payout_paid:          "marked a payout paid",
  assign_practitioner:       "assigned a practitioner",
  update_practitioner_status:"advanced a practitioner",
  record_session_feedback:   "recorded session feedback",
  update_session_feedback:   "updated session feedback",
  generate_agreement_link:   "sent an empanelment agreement",
  create_session:            "created a session",
  create_session_request:    "logged a session request",
  create_payout:             "created a payout",
  create_admin_invite:       "invited an admin",
  revoke_admin_invite:       "revoked an admin invite",
  accept_admin_invite:       "accepted an admin invite",
  create_admin:              "created an admin account",
  change_admin_role:         "changed an admin's role",
  delete_admin:              "removed an admin account",
  set_password:              "set an account password",
  view_admin_password:       "viewed an account password",
  grant_gallery_access:      "granted gallery access",
  revoke_gallery_access:     "revoked gallery access",
  // Global-admin edit/delete actions + session-consent actions
  edit_practitioner:         "edited a practitioner",
  delete_practitioner:       "deleted a practitioner",
  edit_session:              "edited a session",
  delete_session:            "deleted a session",
  edit_session_request:      "edited a session request",
  delete_session_request:    "deleted a session request",
  edit_payout:               "edited a payout",
  delete_payout:             "deleted a payout",
  edit_agreement:            "edited an agreement",
  delete_agreement:          "deleted an agreement",
  generate_consent:          "generated a session consent",
  mark_consent_received:     "marked consent received",
};

function label(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, " ");
}


// Absolute timestamp for the table's Timestamp column, e.g. "03 Jul 2026, 11:42 AM".
function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).replace(",", "");
}



function detail(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const s = snapshot;
  return (
    (s.name as string) ||
    (s.email as string) ||
    (s.practitioner_name as string) ||
    (s.invoice_ref as string) ||
    (s.ref_code as string) ||
    (s.session_ref as string) ||
    null
  );
}


export function ActivityLogView() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: String(PAGE), offset: "0" });
    // Feed is scoped to the last 90 days (see the retention note). API filters on `created_at >= from`.
    qs.set("from", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
    fetch(`/api/admin/global/activity?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setError("");
        setRows(j.data);
      })
      .catch(() => setError("Failed to load activity."))
      .finally(() => setLoading(false));
  }, []);

  // Initial load. The feed is scoped to the last 90 days (see the retention note).
  // Deferred a tick so the loading setState isn't called synchronously in the effect.
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Live: new audit rows appear at the top as admins act.
  useRealtimeChannel("admin_audit_log", (payload) => {
    if (payload.eventType !== "INSERT") return;
    const row = payload.new as unknown as ActivityRow;
    setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
  });

  return (
    <div>
      {/* V6: plain-language retention policy note. */}
      <div style={{ fontSize: 12.5, color: "var(--ink-muted)", background: "var(--surface-sunken)", border: "1px solid rgba(15,17,23,.08)", borderRadius: 8, padding: "8px 11px", marginBottom: 14, lineHeight: 1.55 }}>
        Entries are kept for 90 days on a rolling basis — once a new entry pushes the log past 90 days old, the oldest entry is automatically removed to make room for it.
      </div>

      {error && (
        <div role="alert" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid rgba(15,17,23,.10)", borderRadius: 10, padding: "2.5rem", textAlign: "center", fontSize: 13, color: "var(--ink-faint)" }}>
          Loading…
        </div>
      ) : (
        <AdminTable
          headers={["Timestamp", "User", "Role", "Action"]}
          isEmpty={rows.length === 0}
          emptyText="No activity recorded yet."
        >
          {rows.map((r) => {
            const det = detail(r.snapshot);
            return (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
                {/* Timestamp — single absolute line */}
                <td style={{ ...TD, whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{formatTs(r.created_at)}</div>
                </td>
                {/* User — actor_email (no name field exists on admin_audit_log) */}
                <td style={{ ...TD, verticalAlign: "top" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", wordBreak: "break-all" }}>{r.actor_email}</span>
                </td>
                {/* Role — plain text (Global Admin / Admin / User) */}
                <td style={{ ...TD, verticalAlign: "top" }}>
                  <span style={{ fontSize: 13, color: "var(--ink)" }}>{roleLabel(r.actor_role)}</span>
                </td>
                {/* Action — single plain sentence (humanized label + record detail) */}
                <td style={{ ...TD, verticalAlign: "top" }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                    {label(r.action)}
                    {det && <span style={{ color: "var(--ink-soft)" }}> · {det}</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </AdminTable>
      )}

    </div>
  );
}
