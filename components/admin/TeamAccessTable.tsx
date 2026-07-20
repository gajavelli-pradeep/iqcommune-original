"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "global_admin" | "user";
  gallery_access: boolean;
  last_sign_in_at: string | null;
}

type RevealState = { password: string; set_by: string; set_at: string } | null;

const ROLE_OPTIONS: { value: TeamMember["role"]; label: string }[] = [
  { value: "global_admin", label: "Global Admin" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User (read-only)" },
];
const ROLE_LABEL: Record<TeamMember["role"], string> = {
  global_admin: "Global Admin",
  admin: "Admin",
  user: "User (read-only)",
};

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "8px 12px", borderBottom: "1px solid rgba(15,17,23,.1)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "10px 12px", borderBottom: "1px solid rgba(15,17,23,.06)", verticalAlign: "middle" };

const selectStyle: React.CSSProperties = {
  fontSize: 12, padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)",
  background: "var(--input-paper)", color: "var(--ink)", fontFamily: "inherit", cursor: "pointer",
};
const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13,
  background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", whiteSpace: "nowrap",
};
const smallBtn: React.CSSProperties = {
  fontSize: 12, padding: "6px 12px", border: "1px solid rgba(15,17,23,.18)", borderRadius: 100,
  background: "var(--surface)", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", whiteSpace: "nowrap",
};

// Auth accounts carry no display name, so derive a readable one from the email.
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local.split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : email;
}

function lastActive(ts: string | null): string {
  if (!ts) return "Never signed in";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Settings → Team & Access: interactive list of everyone with console access.
 * Each row has an inline Role select and a "⋯" actions menu (set / reveal
 * password, gallery access, remove) — the same global-admin operations exposed
 * in the Credentials modal, surfaced per-row. Self-destructive actions (change
 * own role, remove self) are hidden for the signed-in global admin.
 */
export function TeamAccessTable({
  reloadKey = 0,
  currentEmail,
  // D11: the roster is readable by any admin, but every control that mutates a
  // teammate (role, password, gallery access, removal) is Global-Admin only. The
  // API enforces this too — this just avoids showing controls that would 403.
  canManage = false,
}: { reloadKey?: number; currentEmail?: string; canManage?: boolean }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pwEditId, setPwEditId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, RevealState>>({});
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>(
    { open: false, title: "", description: "", onConfirm: () => {} }
  );
  const menuRef = useRef<HTMLDivElement>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // reloadKey bumps when the Manage-team modal closes, so invites/removals reflect here.
  useEffect(() => {
    let live = true;
    fetch("/api/admin/global/users")
      .then((r) => r.json())
      .then((j) => { if (!live) return; if (j.data) setMembers(j.data as TeamMember[]); else setError("Failed to load team."); })
      .catch(() => { if (live) setError("Network error."); });
    return () => { live = false; };
  }, [reloadKey]);

  // Close the actions menu on outside click.
  useEffect(() => {
    if (!openMenuId) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  async function changeRole(m: TeamMember, nextRole: TeamMember["role"]) {
    if (nextRole === m.role) return;
    setBusyId(m.id);
    setError("");
    setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, role: nextRole } : x)));
    try {
      const res = await fetch(`/api/admin/global/users/${m.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to update role.");
        setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, role: m.role } : x))); // revert
      } else {
        flash(`${m.email} is now ${ROLE_LABEL[nextRole]}.`);
      }
    } catch {
      setError("Network error.");
      setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, role: m.role } : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleGallery(m: TeamMember) {
    const next = !m.gallery_access;
    setBusyId(m.id);
    setError("");
    setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, gallery_access: next } : x)));
    try {
      const res = await fetch(`/api/admin/global/users/${m.id}/permissions`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ galleryAccess: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to update gallery access.");
        setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, gallery_access: !next } : x)));
      } else {
        flash(`Gallery access ${next ? "granted to" : "revoked for"} ${m.email}.`);
      }
    } catch {
      setError("Network error.");
      setMembers((prev) => prev && prev.map((x) => (x.id === m.id ? { ...x, gallery_access: !next } : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function savePassword(m: TeamMember) {
    if (pwValue.length < 8) { setError("Password must be at least 8 characters."); return; }
    const pw = pwValue;
    setBusyId(m.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/global/users/${m.id}/password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error ?? "Failed to update password.");
      else {
        flash("Password updated.");
        setPwEditId(null); setPwValue("");
        setRevealed((prev) => ({ ...prev, [m.id]: { password: pw, set_by: currentEmail ?? "you", set_at: new Date().toISOString() } }));
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function revealPassword(m: TeamMember) {
    if (m.id in revealed) {
      setRevealed((prev) => { const n = { ...prev }; delete n[m.id]; return n; });
      return;
    }
    setBusyId(m.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/global/users/${m.id}/password`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error ?? "Failed to reveal password.");
      else setRevealed((prev) => ({ ...prev, [m.id]: j.data as RevealState }));
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPassword(pw: string) {
    try { await navigator.clipboard.writeText(pw); flash("Password copied."); }
    catch { setError("Copy failed — select and copy manually."); }
  }

  function askRemove(m: TeamMember) {
    setConfirm({
      open: true,
      title: `Remove ${m.email}`,
      description: "This permanently deletes the account and revokes all console access. This cannot be undone.",
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        setBusyId(m.id);
        setError("");
        try {
          const res = await fetch(`/api/admin/global/users/${m.id}`, { method: "DELETE" });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error ?? "Failed to remove account.");
          } else {
            setMembers((prev) => prev && prev.filter((x) => x.id !== m.id));
            flash(`${m.email} removed.`);
          }
        } catch {
          setError("Network error.");
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {error && (
        <div role="alert" style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--red)", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "visible", border: "1px solid rgba(15,17,23,.08)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Last active</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members === null ? (
              <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--ink-faint)" }}>Loading team…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "var(--ink-faint)" }}>No team members yet.</td></tr>
            ) : members.map((m) => {
              const isSelf = !!currentEmail && m.email.toLowerCase() === currentEmail.toLowerCase();
              const busy = busyId === m.id;
              const revealOpen = m.id in revealed;
              const rev = revealed[m.id];
              return (
                <tr key={m.id}>
                  <td style={{ ...td, fontWeight: 500 }}>
                    {nameFromEmail(m.email)}
                    {isSelf && <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}> · you</span>}
                  </td>
                  <td style={{ ...td, color: "var(--ink-muted)" }}>{m.email}</td>

                  {/* Role — editable dropdown for a Global Admin; a plain label otherwise
                      (disabled for self; the API blocks self-demotion either way). */}
                  <td style={td}>
                    {canManage ? (
                      <select
                        value={m.role}
                        disabled={isSelf || busy}
                        aria-label={`Role for ${m.email}`}
                        onChange={(e) => changeRole(m, e.target.value as TeamMember["role"])}
                        style={{ ...selectStyle, opacity: isSelf || busy ? 0.55 : 1, cursor: isSelf || busy ? "not-allowed" : "pointer" }}
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: "var(--ink-muted)" }}>
                        {ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}
                      </span>
                    )}
                  </td>

                  <td style={{ ...td, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{lastActive(m.last_sign_in_at)}</td>

                  {/* Actions — "⋯" dropdown, Global-Admin only */}
                  <td style={{ ...td, textAlign: "right", position: "relative" }}>
                    {!canManage && <span style={{ color: "var(--ink-faint)" }}>—</span>}
                    {canManage && (
                    <>
                    <button
                      type="button"
                      aria-label={`Actions for ${m.email}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === m.id}
                      disabled={busy}
                      onClick={() => setOpenMenuId((id) => (id === m.id ? null : m.id))}
                      style={{ ...smallBtn, padding: "4px 10px", opacity: busy ? 0.6 : 1 }}
                    >
                      ⋯
                    </button>
                    {openMenuId === m.id && (
                      <div
                        ref={menuRef}
                        role="menu"
                        style={{
                          position: "absolute", top: "calc(100% - 2px)", right: 8, zIndex: 60, minWidth: 190,
                          background: "var(--surface)", border: "1px solid rgba(15,17,23,.12)", borderRadius: 10,
                          boxShadow: "0 14px 36px -14px rgba(20,16,10,0.28), 0 2px 6px rgba(20,16,10,0.06)",
                          padding: 4, textAlign: "left",
                        }}
                      >
                        <button type="button" role="menuitem" style={menuItemStyle}
                          onClick={() => { setOpenMenuId(null); setPwEditId(m.id); setPwValue(""); setShowPw(false); }}>
                          Set password
                        </button>
                        <button type="button" role="menuitem" style={menuItemStyle}
                          onClick={() => { setOpenMenuId(null); revealPassword(m); }}>
                          {revealOpen ? "Hide password" : "Reveal password"}
                        </button>
                        {m.role === "admin" && (
                          <button type="button" role="menuitem" style={menuItemStyle}
                            onClick={() => { setOpenMenuId(null); toggleGallery(m); }}>
                            {m.gallery_access ? "Revoke gallery access" : "Grant gallery access"}
                          </button>
                        )}
                        {!isSelf && (
                          <button type="button" role="menuitem" style={{ ...menuItemStyle, color: "var(--red)" }}
                            onClick={() => { setOpenMenuId(null); askRemove(m); }}>
                            Remove
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inline panels: set-password / revealed password (below the actions cell, full width) */}
                    {(pwEditId === m.id || revealOpen) && (
                      <div style={{ marginTop: 8, textAlign: "left", display: "grid", gap: 8 }}>
                        {pwEditId === m.id && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              type={showPw ? "text" : "password"}
                              value={pwValue}
                              onChange={(e) => { setPwValue(e.target.value); setError(""); }}
                              placeholder="New password (min 8 chars)"
                              autoFocus
                              style={{ ...selectStyle, flex: 1, minWidth: 160, cursor: "text" }}
                            />
                            <button type="button" style={smallBtn} onClick={() => setShowPw((v) => !v)}>{showPw ? "Hide" : "Show"}</button>
                            <button type="button" disabled={busy} style={{ ...smallBtn, background: "var(--ink)", color: "var(--surface)", border: "none", opacity: busy ? 0.6 : 1 }} onClick={() => savePassword(m)}>
                              {busy ? "Saving…" : "Save"}
                            </button>
                            <button type="button" style={smallBtn} onClick={() => { setPwEditId(null); setPwValue(""); setError(""); }}>Cancel</button>
                          </div>
                        )}
                        {revealOpen && (
                          rev === null ? (
                            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                              No global-admin-set password stored. Use <strong>Set password</strong> to create one.
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--surface)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "6px 10px", flexWrap: "wrap" }}>
                              <code style={{ flex: 1, fontSize: 13, fontFamily: "ui-monospace, monospace", color: "var(--ink)", wordBreak: "break-all" }}>{rev.password}</code>
                              <button type="button" style={smallBtn} onClick={() => copyPassword(rev.password)}>Copy</button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--ink)", color: "var(--surface)", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
