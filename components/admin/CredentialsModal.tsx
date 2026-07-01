"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  gallery_access: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

interface AdminInvite {
  id: string;
  email: string;
  status: "Pending" | "Accepted" | "Revoked" | "Expired";
  invited_by: string;
  created_at: string;
  expires_at: string;
}

const INVITE_STATUS_COLOR: Record<AdminInvite["status"], { fg: string; bg: string; border: string }> = {
  Pending:  { fg: "var(--gold-dark)", bg: "var(--gold-light)",  border: "var(--gold-border)" },
  Accepted: { fg: "var(--green)",     bg: "var(--green-light)", border: "var(--green-border)" },
  Revoked:  { fg: "var(--ink-faint)", bg: "var(--surface-sunken)", border: "rgba(20,18,12,.12)" },
  Expired:  { fg: "var(--ink-faint)", bg: "var(--surface-sunken)", border: "rgba(20,18,12,.12)" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** The signed-in super-admin's email — self-destructive actions are hidden for that row. */
  currentEmail?: string;
}

export function CredentialsModal({ open, onClose, currentEmail }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [galleryBusyId, setGalleryBusyId] = useState<string | null>(null);

  // Reveal vault: the current SA-set password per account (null = none stored).
  // A key present in the map = that row is currently revealed.
  const [revealed, setRevealed] = useState<Record<string, { password: string; set_by: string; set_at: string } | null>>({});
  const [revealBusyId, setRevealBusyId] = useState<string | null>(null);
  const [pwCopiedId, setPwCopiedId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [error, setError] = useState("");

  // Add-admin form
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newAdminPw, setNewAdminPw] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");

  // Invite ("summon") flow
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invModeOn, setInvModeOn] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const flash = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // setState happens only inside the promise callbacks (never synchronously in
  // the effect body), so this stays clear of react-hooks/set-state-in-effect.
  const loadUsers = useCallback(() => {
    fetch("/api/admin/super/users")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setUsers(j.data);
        else setError("Failed to load users.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  const loadInvites = useCallback(() => {
    fetch("/api/admin/super/invites")
      .then((r) => r.json())
      .then((j) => { if (j.data) setInvites(j.data as AdminInvite[]); })
      .catch(() => {});
  }, []);

  // The modal is conditionally mounted (see AdminConsoleView), so every open is a
  // fresh mount — useState defaults handle the reset; the effect only loads data.
  useEffect(() => { loadUsers(); loadInvites(); }, [loadUsers, loadInvites]);

  async function handleCreateInvite() {
    const email = inviteEmail.trim();
    if (!email) { setError("Enter an email to invite."); return; }
    setInviting(true);
    setError("");
    setInviteLink(null);
    try {
      const res = await fetch("/api/admin/super/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed to create invite."); return; }
      setInviteLink(j.url as string);
      setInviteEmail("");
      setCopied(false);
      if (j.data) setInvites((prev) => [j.data as AdminInvite, ...prev]);
    } catch {
      setError("Network error.");
    } finally {
      setInviting(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select and copy the link manually.");
    }
  }

  async function handleRevokeInvite(id: string) {
    setRevokingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/super/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to revoke invite.");
        return;
      }
      setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: "Revoked" } : i)));
      flash("Invite revoked.", true);
    } catch {
      setError("Network error.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleSetPassword(userId: string) {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const pw = newPassword;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/super/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error ?? "Failed to update password.");
      else {
        flash("Password updated successfully.", true);
        setEditingId(null);
        setNewPassword("");
        // Immediately reveal the just-set password so the SA can copy it.
        setRevealed((prev) => ({
          ...prev,
          [userId]: { password: pw, set_by: currentEmail ?? "you", set_at: new Date().toISOString() },
        }));
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newEmail || newAdminPw.length < 8) {
      setError("Email and a password of at least 8 characters are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/super/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newAdminPw, role: newRole }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error ?? "Failed to create admin.");
      else {
        flash(`Admin ${newEmail} created.`, true);
        setAdding(false);
        setNewEmail("");
        setNewAdminPw("");
        setNewRole("admin");
        if (j.data) setUsers((prev) => [...prev, j.data as AdminUser]);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRole(u: AdminUser) {
    const nextRole = u.role === "super_admin" ? "admin" : "super_admin";
    setBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/super/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error ?? "Failed to update role.");
      else {
        flash(`${u.email} is now ${nextRole === "super_admin" ? "Super Admin" : "Admin"}.`, true);
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReveal(u: AdminUser) {
    // Toggle off if already shown.
    if (u.id in revealed) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[u.id];
        return next;
      });
      return;
    }
    setRevealBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/super/users/${u.id}/password`);
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "Failed to reveal password.");
        return;
      }
      setRevealed((prev) => ({ ...prev, [u.id]: j.data })); // j.data may be null
    } catch {
      setError("Network error.");
    } finally {
      setRevealBusyId(null);
    }
  }

  async function copyPassword(id: string, pw: string) {
    try {
      await navigator.clipboard.writeText(pw);
      setPwCopiedId(id);
      setTimeout(() => setPwCopiedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      setError("Copy failed — select and copy manually.");
    }
  }

  async function handleToggleGallery(u: AdminUser) {
    const next = !u.gallery_access;
    setGalleryBusyId(u.id);
    setError("");
    // Optimistic — revert on failure.
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, gallery_access: next } : x)));
    try {
      const res = await fetch(`/api/admin/super/users/${u.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ galleryAccess: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to update gallery access.");
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, gallery_access: !next } : x)));
      } else {
        flash(`Gallery access ${next ? "granted to" : "revoked for"} ${u.email}.`, true);
      }
    } catch {
      setError("Network error.");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, gallery_access: !next } : x)));
    } finally {
      setGalleryBusyId(null);
    }
  }

  async function handleRemove(u: AdminUser) {
    setBusyId(u.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/super/users/${u.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error ?? "Failed to remove admin.");
      else {
        flash(`${u.email} removed.`, true);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
      setConfirmRemoveId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,22,29,.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 560,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid rgba(20,18,12,.1)",
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Admin Accounts</div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
              Create, remove, promote, and set passwords for admin accounts
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-faint)",
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 22px 22px", overflowY: "auto" }}>
          {toast && (
            <div
              style={{
                background: toast.ok ? "var(--green-light)" : "var(--red-light)",
                border: `1px solid ${toast.ok ? "var(--green-border)" : "var(--red-border)"}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 13,
                color: toast.ok ? "var(--green)" : "var(--red)",
                marginBottom: 14,
              }}
            >
              {toast.msg}
            </div>
          )}

          {error && (
            <div
              style={{
                background: "var(--red-light)",
                border: "1px solid var(--red-border)",
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 13,
                color: "var(--red)",
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Invite a new admin ("summon") — SA generates a shareable link */}
          <div style={{ marginBottom: 18, border: "1px solid rgba(20,18,12,.12)", borderRadius: 10, padding: 14, background: "var(--surface-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Invite an admin</div>
                <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                  Generate a single-use link (expires in 7 days). Share it — they set their own password.
                </div>
              </div>
              {!invModeOn && (
                <button onClick={() => { setInvModeOn(true); setError(""); setInviteLink(null); }} style={smallBtn}>
                  + Invite admin
                </button>
              )}
            </div>

            {invModeOn && (
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setError(""); }}
                    placeholder="Email to invite"
                    autoFocus
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  />
                  <button
                    onClick={handleCreateInvite}
                    disabled={inviting}
                    style={{ padding: "8px 14px", background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: inviting ? "not-allowed" : "pointer", opacity: inviting ? 0.6 : 1, fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {inviting ? "Generating…" : "Generate link"}
                  </button>
                  <button
                    onClick={() => { setInvModeOn(false); setInviteLink(null); setError(""); }}
                    style={{ padding: "8px 14px", background: "transparent", color: "var(--ink-soft)", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Close
                  </button>
                </div>

                {inviteLink && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--surface)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "8px 10px" }}>
                    <input readOnly value={inviteLink} onFocus={(e) => e.currentTarget.select()} style={{ ...inputStyle, flex: 1, fontSize: 12, border: "none", background: "transparent", padding: 0 }} />
                    <button onClick={copyInviteLink} style={{ ...smallBtn, whiteSpace: "nowrap" }}>
                      {copied ? "Copied ✓" : "Copy link"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {invites.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                {invites.map((inv) => {
                  const c = INVITE_STATUS_COLOR[inv.status];
                  return (
                    <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, padding: "6px 0", borderTop: "1px solid rgba(20,18,12,.08)" }}>
                      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{inv.email}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.fg, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 100, padding: "1px 9px" }}>
                          {inv.status}
                        </span>
                        {inv.status === "Pending" && (
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            disabled={revokingId === inv.id}
                            style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)", opacity: revokingId === inv.id ? 0.6 : 1 }}
                          >
                            {revokingId === inv.id ? "Revoking…" : "Revoke"}
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add admin */}
          <div style={{ marginBottom: 16 }}>
            {!adding ? (
              <button
                onClick={() => { setAdding(true); setError(""); }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 14px",
                  border: "1px solid rgba(20,18,12,.18)",
                  borderRadius: 8,
                  background: "var(--surface)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--ink)",
                }}
              >
                + New admin
              </button>
            ) : (
              <div style={{ border: "1px solid rgba(20,18,12,.12)", borderRadius: 10, padding: "14px", background: "var(--surface-soft)", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Create a new admin</div>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setError(""); }}
                  placeholder="Email address"
                  autoFocus
                  style={inputStyle}
                />
                <input
                  type="password"
                  value={newAdminPw}
                  onChange={(e) => { setNewAdminPw(e.target.value); setError(""); }}
                  placeholder="Password (min 8 chars)"
                  style={inputStyle}
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}
                  style={inputStyle}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCreate}
                    disabled={saving}
                    style={{ flex: 1, padding: "8px", background: "var(--ink)", color: "var(--surface)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}
                  >
                    {saving ? "Creating…" : "Create admin"}
                  </button>
                  <button
                    onClick={() => { setAdding(false); setError(""); }}
                    style={{ padding: "8px 14px", background: "transparent", color: "var(--ink-soft)", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ color: "var(--ink-faint)", fontSize: 13, padding: "12px 0" }}>
              Loading users…
            </div>
          ) : users.length === 0 ? (
            <div style={{ color: "var(--ink-faint)", fontSize: 13, padding: "12px 0" }}>
              No admin accounts found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {users.map((u) => {
                const isSelf = !!currentEmail && u.email?.toLowerCase() === currentEmail.toLowerCase();
                const busy = busyId === u.id;
                return (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid rgba(20,18,12,.1)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "var(--surface-soft)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {u.email}
                        {isSelf && <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}> · you</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                        {u.role === "super_admin" ? "Super Admin" : "Admin"}
                        {u.last_sign_in_at
                          ? ` · last sign-in ${new Date(u.last_sign_in_at).toLocaleDateString("en-IN")}`
                          : ""}
                      </div>
                    </div>
                    {editingId !== u.id && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          onClick={() => { setEditingId(u.id); setNewPassword(""); setError(""); setShowPw(false); setConfirmRemoveId(null); }}
                          style={smallBtn}
                        >
                          Set password
                        </button>
                        <button
                          onClick={() => handleReveal(u)}
                          disabled={revealBusyId === u.id}
                          style={{ ...smallBtn, opacity: revealBusyId === u.id ? 0.6 : 1 }}
                        >
                          {revealBusyId === u.id ? "…" : u.id in revealed ? "Hide password" : "Reveal password"}
                        </button>
                        {!isSelf && (
                          <button onClick={() => handleToggleRole(u)} disabled={busy} style={{ ...smallBtn, opacity: busy ? 0.6 : 1 }}>
                            {u.role === "super_admin" ? "Make Admin" : "Make Super Admin"}
                          </button>
                        )}
                        {!isSelf && (
                          confirmRemoveId === u.id ? (
                            <button onClick={() => handleRemove(u)} disabled={busy} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)", opacity: busy ? 0.6 : 1 }}>
                              {busy ? "Removing…" : "Confirm remove"}
                            </button>
                          ) : (
                            <button onClick={() => setConfirmRemoveId(u.id)} style={{ ...smallBtn, border: "1px solid var(--red-border)", color: "var(--red)" }}>
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {u.id in revealed && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(20,18,12,.08)" }}>
                      {revealed[u.id] === null ? (
                        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                          No super-admin-set password stored yet. Use <strong>Set password</strong> to create one.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "8px 10px" }}>
                            <code style={{ flex: 1, fontSize: 13, fontFamily: "ui-monospace, monospace", color: "var(--ink)", wordBreak: "break-all" }}>
                              {revealed[u.id]!.password}
                            </code>
                            <button onClick={() => copyPassword(u.id, revealed[u.id]!.password)} style={{ ...smallBtn, whiteSpace: "nowrap" }}>
                              {pwCopiedId === u.id ? "Copied ✓" : "Copy"}
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
                            Last set by {revealed[u.id]!.set_by} · {new Date(revealed[u.id]!.set_at).toLocaleString("en-IN")}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {editingId !== u.id && u.role === "admin" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(20,18,12,.08)" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        Gallery access
                        <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: 6 }}>
                          {u.gallery_access ? "can manage the gallery" : "no gallery access"}
                        </span>
                      </span>
                      <button
                        role="switch"
                        aria-checked={u.gallery_access}
                        aria-label={`${u.gallery_access ? "Revoke" : "Grant"} gallery access for ${u.email}`}
                        disabled={galleryBusyId === u.id}
                        onClick={() => handleToggleGallery(u)}
                        style={{
                          flexShrink: 0, width: 38, height: 22, borderRadius: 100, border: "none",
                          cursor: galleryBusyId === u.id ? "not-allowed" : "pointer",
                          background: u.gallery_access ? "var(--green)" : "rgba(20,18,12,.20)",
                          position: "relative", transition: "background .15s", padding: 0,
                          opacity: galleryBusyId === u.id ? 0.6 : 1,
                        }}
                      >
                        <span style={{ position: "absolute", top: 2, left: u.gallery_access ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "var(--surface)", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
                      </button>
                    </div>
                  )}

                  {editingId === u.id && (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                          placeholder="New password (min 8 chars)"
                          autoFocus
                          style={{
                            width: "100%",
                            padding: "9px 40px 9px 12px",
                            border: "1px solid rgba(20,18,12,.18)",
                            borderRadius: 8,
                            fontSize: 13,
                            fontFamily: "inherit",
                            background: "var(--surface)",
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? "Hide" : "Show"}
                          style={{
                            position: "absolute",
                            right: 1,
                            top: 1,
                            bottom: 1,
                            width: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--ink-faint)",
                            borderRadius: "0 7px 7px 0",
                          }}
                        >
                          {showPw ? (
                            <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleSetPassword(u.id)}
                          disabled={saving}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: "var(--ink)",
                            color: "var(--surface)",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: saving ? "not-allowed" : "pointer",
                            opacity: saving ? 0.6 : 1,
                            fontFamily: "inherit",
                          }}
                        >
                          {saving ? "Saving…" : "Save password"}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setNewPassword(""); setError(""); }}
                          style={{
                            padding: "8px 14px",
                            background: "transparent",
                            color: "var(--ink-soft)",
                            border: "1px solid rgba(20,18,12,.18)",
                            borderRadius: 8,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  background: "var(--surface)",
  boxSizing: "border-box",
};

const smallBtn: React.CSSProperties = {
  fontSize: 12,
  padding: "5px 12px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 6,
  background: "var(--surface)",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  color: "var(--ink)",
};
