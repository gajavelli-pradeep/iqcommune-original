"use client";

import { useEffect, useState } from "react";

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "global_admin";
  last_sign_in_at: string | null;
}

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "8px 12px", borderBottom: "1px solid rgba(20,18,12,.1)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "10px 12px", borderBottom: "1px solid rgba(20,18,12,.06)" };

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

function RolePill({ role }: { role: TeamMember["role"] }) {
  const isGlobal = role === "global_admin";
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, whiteSpace: "nowrap", background: isGlobal ? "var(--gold-light)" : "var(--surface-sunken)", color: isGlobal ? "var(--gold-dark)" : "var(--ink-soft)" }}>
      {isGlobal ? "Global Admin" : "Admin"}
    </span>
  );
}

/** Settings → Team & Access: inline list of everyone with console access (V4). */
export function TeamAccessTable({ reloadKey = 0 }: { reloadKey?: number }) {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState("");

  // reloadKey bumps when the Manage-team modal closes, so invites/removals reflect here.
  useEffect(() => {
    let live = true;
    fetch("/api/admin/global/users")
      .then((r) => r.json())
      .then((j) => { if (!live) return; if (j.data) setMembers(j.data as TeamMember[]); else setError("Failed to load team."); })
      .catch(() => { if (live) setError("Network error."); });
    return () => { live = false; };
  }, [reloadKey]);

  return (
    <div style={{ overflowX: "auto", border: "1px solid rgba(20,18,12,.08)", borderRadius: 8, marginTop: "1rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Last active</th>
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "var(--red)" }}>{error}</td></tr>
          ) : members === null ? (
            <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "var(--ink-faint)" }}>Loading team…</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: "var(--ink-faint)" }}>No team members yet.</td></tr>
          ) : members.map((m) => (
            <tr key={m.id}>
              <td style={{ ...td, fontWeight: 500 }}>{nameFromEmail(m.email)}</td>
              <td style={{ ...td, color: "var(--ink-muted)" }}>{m.email}</td>
              <td style={td}><RolePill role={m.role} /></td>
              <td style={{ ...td, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{lastActive(m.last_sign_in_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
