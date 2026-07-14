"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeChannel } from "@/lib/hooks/use-realtime-list";

// V5 Settings "Invite a new team member" block (iqcommune-admin-console.html §Team
// & Access). Global-admin only — the caller gates rendering. Self-contained: owns
// its invite list, realtime sync, and the create/copy/revoke flow, so it can be
// dropped both inline on the Settings panel and inside the credentials modal
// without duplicating the logic.

type InviteRole = "user" | "admin" | "global_admin";

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "global_admin", label: "Global Admin" },
];

interface AdminInvite {
  id: string;
  email: string;
  role?: string;
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

const inputStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: 13,
  padding: "8px 10px",
  border: "1px solid rgba(20,18,12,.18)",
  borderRadius: 6,
  background: "var(--input-paper)",
  color: "var(--ink)",
};

export function InviteTeamMember() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("user");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"sent" | "failed" | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadInvites = useCallback(() => {
    fetch("/api/admin/global/invites")
      .then((r) => r.json())
      .then((j) => { if (j.data) setInvites(j.data as AdminInvite[]); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  // Keep the list in sync across global-admin sessions (and across this
  // component's own instances, e.g. Settings inline + the modal).
  useRealtimeChannel("admin_invites", (payload) => {
    if (payload.eventType === "INSERT") {
      const row = payload.new as unknown as AdminInvite;
      setInvites((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]));
    } else if (payload.eventType === "UPDATE") {
      const row = payload.new as unknown as AdminInvite;
      setInvites((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...row } : i)));
    } else if (payload.eventType === "DELETE") {
      const id = (payload.old as { id?: string })?.id;
      setInvites((prev) => prev.filter((i) => i.id !== id));
    }
  });

  async function handleCreate() {
    const trimmed = email.trim();
    if (!trimmed) { setError("Enter an email to invite."); return; }
    setInviting(true);
    setError("");
    setInviteLink(null);
    setInvitedEmail(null);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/admin/global/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Failed to create invite."); return; }
      setInviteLink(j.url as string);
      setInvitedEmail((j.email as string) ?? trimmed);
      setEmailStatus((j.emailStatus as "sent" | "failed") ?? null);
      setEmail("");
      setCopied(false);
      if (j.data) setInvites((prev) => [j.data as AdminInvite, ...prev]);
    } catch {
      setError("Network error.");
    } finally {
      setInviting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select and copy the link manually.");
    }
  }

  // Opens the admin's own mail app with a prefilled draft to the invitee — a
  // fallback that works even if the Brevo auto-send failed or DNS isn't set up yet.
  function mailtoHref(): string {
    const subject = encodeURIComponent("You're invited to the iqcommune admin console");
    const body = encodeURIComponent(
      `Hi,\n\nYou've been invited to join the iqcommune admin console.\n\n` +
      `Accept your invite here:\n${inviteLink ?? ""}\n\n` +
      `This link is single-use and expires in 7 days.`
    );
    return `mailto:${invitedEmail ?? ""}?subject=${subject}&body=${body}`;
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/global/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to revoke invite.");
        return;
      }
      setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: "Revoked" } : i)));
    } catch {
      setError("Network error.");
    } finally {
      setRevokingId(null);
    }
  }

  const smallBtn: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 12px",
    border: "1px solid rgba(20,18,12,.18)",
    borderRadius: 6,
    background: "var(--surface)",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "var(--ink)",
  };

  return (
    <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "14px 16px", marginTop: "0.85rem" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
        Invite a new team member
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="name@company.com"
          aria-label="Email to invite"
          style={{ ...inputStyle, flex: 2, minWidth: 200 }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as InviteRole)}
          aria-label="Role for this invite"
          style={{ ...inputStyle, flex: 1, minWidth: 130, cursor: "pointer", background: "var(--surface)" }}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={inviting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "var(--ink)", color: "var(--surface)",
            border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: inviting ? "not-allowed" : "pointer", opacity: inviting ? 0.6 : 1,
            fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {inviting ? "Sending…" : "Send invite"}
        </button>
      </div>

      {/* Escalation warning — a Global-Admin link grants full access to whoever opens it. */}
      {role === "global_admin" && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--gold-dark)", background: "var(--gold-light)", border: "1px solid var(--gold-border)", borderRadius: 6, padding: "7px 10px", lineHeight: 1.5 }}>
          This link grants <strong>full Global-Admin access</strong> to anyone who opens it. Share it only over a secure, private channel.
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--red)" }}>{error}</div>
      )}

      {inviteLink && (
        <div style={{ marginTop: 10 }}>
          {emailStatus && (
            <div style={{ fontSize: 12, marginBottom: 6, color: emailStatus === "sent" ? "var(--green)" : "var(--ink-muted)" }}>
              {emailStatus === "sent"
                ? `Invite emailed to ${invitedEmail} ✓ — or share the link below.`
                : "Couldn't email the invite automatically — send it manually below."}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "var(--surface)", border: "1px solid var(--gold-border)", borderRadius: 8, padding: "8px 10px" }}>
            <input
              readOnly
              value={inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              style={{ ...inputStyle, flex: 1, minWidth: 160, fontSize: 12, border: "none", background: "transparent", padding: 0 }}
            />
            <a href={mailtoHref()} style={{ ...smallBtn, whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Open in email app
            </a>
            <button onClick={copyLink} style={{ ...smallBtn, whiteSpace: "nowrap" }}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          {invites.map((inv) => {
            const c = INVITE_STATUS_COLOR[inv.status];
            return (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, padding: "6px 0", borderTop: "1px solid rgba(20,18,12,.08)" }}>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {inv.email}
                  {inv.role === "global_admin" && (
                    <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "var(--gold-dark)" }}>· Global Admin</span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.fg, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 100, padding: "1px 9px" }}>
                    {inv.status}
                  </span>
                  {inv.status === "Pending" && (
                    <button
                      onClick={() => handleRevoke(inv.id)}
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
  );
}
