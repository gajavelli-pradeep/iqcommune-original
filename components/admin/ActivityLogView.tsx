"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

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
};

function label(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, " ");
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Render a compact "before → after" fragment when the snapshot carries one.
function transition(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;
  const before = snapshot.before as Record<string, unknown> | undefined;
  const after = snapshot.after as Record<string, unknown> | undefined;
  const key = after ? Object.keys(after)[0] : undefined;
  if (key && after) {
    const a = String(after[key]);
    const b = before ? String(before[key] ?? "—") : null;
    return b ? `${b} → ${a}` : a;
  }
  return null;
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

const ACTIONS = Object.keys(ACTION_LABEL);

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "inherit",
  background: "var(--surface)",
  color: "var(--ink)",
};

export function ActivityLogView() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback((reset: boolean, actorF: string, actionF: string, off: number) => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: String(PAGE), offset: String(off) });
    if (actorF) qs.set("actor", actorF);
    if (actionF) qs.set("action", actionF);
    fetch(`/api/admin/global/activity?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setError("");
        setTotal(j.total ?? 0);
        setRows((prev) => (reset ? j.data : [...prev, ...j.data]));
      })
      .catch(() => setError("Failed to load activity."))
      .finally(() => setLoading(false));
  }, []);

  // Initial load + reload whenever a filter changes (debounced for the text input).
  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); load(true, actor, action, 0); }, actor ? 300 : 0);
    return () => clearTimeout(t);
  }, [actor, action, load]);

  const loadMore = () => {
    const next = offset + PAGE;
    setOffset(next);
    load(false, actor, action, next);
  };

  // Live: new audit rows appear at the top as admins act (respects active filters).
  useRealtimeChannel("admin_audit_log", (payload) => {
    if (payload.eventType !== "INSERT") return;
    const row = payload.new as unknown as ActivityRow;
    if (action && row.action !== action) return;
    if (actor && !row.actor_email?.toLowerCase().includes(actor.toLowerCase())) return;
    setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
    setTotal((t) => t + 1);
  });

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Filter by admin email…"
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={action} onChange={(e) => setAction(e.target.value)} style={inputStyle}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{label(a)}</option>
          ))}
        </select>
        {(actor || action) && (
          <button
            onClick={() => { setActor(""); setAction(""); }}
            style={{ ...inputStyle, cursor: "pointer", color: "var(--ink-soft)" }}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div role="alert" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--red)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {!loading && rows.length === 0 && !error ? (
        <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "2.5rem", textAlign: "center", fontSize: 13, color: "var(--ink-faint)" }}>
          No activity recorded yet.
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, overflow: "hidden" }}>
          {rows.map((r, i) => {
            const trans = transition(r.snapshot);
            const det = detail(r.snapshot);
            const isSA = isGlobalAdminRole(r.actor_role);
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(20,18,12,.07)" }}>
                <span
                  title={isSA ? "Global Admin" : "Admin"}
                  style={{ flexShrink: 0, marginTop: 3, width: 8, height: 8, borderRadius: "50%", background: isSA ? "var(--gold)" : "var(--blue)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                    <strong style={{ fontWeight: 600 }}>{r.actor_email}</strong>
                    {" "}{label(r.action)}
                    {det && <span style={{ color: "var(--ink-soft)" }}> · {det}</span>}
                    {trans && (
                      <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: "var(--gold-dark)", background: "var(--gold-light)", borderRadius: 100, padding: "1px 8px" }}>
                        {trans}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                    {isSA ? "Global Admin" : "Admin"} · {r.record_table} · {timeAgo(r.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {loading ? "Loading…" : `Showing ${rows.length} of ${total}`}
        </span>
        {rows.length < total && !loading && (
          <button
            onClick={loadMore}
            style={{ ...inputStyle, cursor: "pointer", fontWeight: 600, color: "var(--ink)" }}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
