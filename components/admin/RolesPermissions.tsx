// Settings → Roles & Permissions: static reference of what each role can do (V4).
const CAPABILITIES: { cap: string; global: boolean; admin: boolean; user: boolean }[] = [
  { cap: "View all data (requests, practitioners, sessions, agreements, payouts, photos)", global: true, admin: true, user: true },
  { cap: "Download & export (photos, agreements, reports)", global: true, admin: true, user: true },
  { cap: "Add, edit & delete platform data (sessions, practitioners, photos, payouts, etc.)", global: true, admin: true, user: false },
  { cap: "Send communications (agreements, reminders, confirmations)", global: true, admin: true, user: false },
  { cap: "Invite a new Admin or User", global: true, admin: false, user: false },
  { cap: "Remove an Admin or User", global: true, admin: false, user: false },
  { cap: "View platform-wide Activity log", global: true, admin: false, user: false },
];

const th: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "8px 12px", borderBottom: "1px solid rgba(15,17,23,.1)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "10px 12px", borderBottom: "1px solid rgba(15,17,23,.06)" };

function Cell({ ok }: { ok: boolean }) {
  return ok
    ? <span style={{ color: "var(--ink)" }} aria-label="Yes">✓</span>
    : <span style={{ color: "var(--ink)" }} aria-label="No">—</span>;
}

export function RolesPermissions() {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>Roles &amp; Permissions</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginBottom: "1rem" }}>
        Reference — what each role can and can&apos;t do across the console.
      </div>
      <div style={{ overflowX: "auto", border: "1px solid rgba(15,17,23,.08)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>Capability</th>
              <th style={{ ...th, textAlign: "left" }}>Global Admin</th>
              <th style={{ ...th, textAlign: "left" }}>Admin</th>
              <th style={{ ...th, textAlign: "left" }}>User</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((row) => (
              <tr key={row.cap}>
                <td style={td}>{row.cap}</td>
                <td style={{ ...td, textAlign: "left" }}><Cell ok={row.global} /></td>
                <td style={{ ...td, textAlign: "left" }}><Cell ok={row.admin} /></td>
                <td style={{ ...td, textAlign: "left" }}><Cell ok={row.user} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
