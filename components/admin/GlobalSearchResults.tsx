"use client";

import { StatusPill } from "@/components/shared/StatusPill";

interface PractitionerLike { id: string; name: string; email: string; role: string; city: string; modules: string[]; status: string; }
interface SessionLike { id: string; ref_code: string; module: string; venue: string; status: string; practitioner: { name: string } | null; }
interface RequestLike { id: string; name: string; org: string; email: string; topic: string; status: string; }

function matches(query: string, ...fields: (string | null | undefined)[]) {
  const q = query.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

export function GlobalSearchResults({
  query,
  practitioners,
  sessions,
  requests,
  onNavigate,
}: {
  query: string;
  practitioners: PractitionerLike[];
  sessions: SessionLike[];
  requests: RequestLike[];
  onNavigate: (tab: string) => void;
}) {
  const q = query.trim();
  const pr = practitioners.filter((p) => matches(q, p.name, p.email, p.role, p.city, (p.modules ?? []).join(" ")));
  const se = sessions.filter((s) => matches(q, s.ref_code, s.module, s.venue, s.practitioner?.name));
  const rq = requests.filter((r) => matches(q, r.name, r.org, r.email, r.topic));
  const total = pr.length + se.length + rq.length;

  return (
    <div>
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(15,17,23,.10)", padding: "1.25rem 1.75rem" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#0f1117", margin: 0 }}>Search results</h1>
        <p style={{ fontSize: 13, color: "#9496a1", marginTop: 1, marginBottom: 0 }}>
          {total} match{total === 1 ? "" : "es"} for “{q}”
        </p>
      </div>

      <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {total === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9496a1", fontSize: 13 }}>
            Nothing matches “{q}”. Try a name, email, module, ref code, or organisation.
          </div>
        )}

        <Section title="Practitioners" count={pr.length} onSeeAll={() => onNavigate("practitioners")}>
          {pr.slice(0, 8).map((p) => (
            <Row key={p.id} onClick={() => onNavigate("practitioners")}
              primary={p.name} secondary={`${p.role} · ${p.city}`} status={p.status} />
          ))}
        </Section>

        <Section title="Sessions" count={se.length} onSeeAll={() => onNavigate("sessions")}>
          {se.slice(0, 8).map((s) => (
            <Row key={s.id} onClick={() => onNavigate("sessions")}
              primary={`${s.ref_code} · ${s.module}`} secondary={`${s.practitioner?.name ?? "—"} · ${s.venue}`} status={s.status} />
          ))}
        </Section>

        <Section title="Session requests" count={rq.length} onSeeAll={() => onNavigate("requests")}>
          {rq.slice(0, 8).map((r) => (
            <Row key={r.id} onClick={() => onNavigate("requests")}
              primary={`${r.name} · ${r.org}`} secondary={r.topic} status={r.status} />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, onSeeAll, children }: { title: string; count: number; onSeeAll: () => void; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(15,17,23,.10)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(15,17,23,.08)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#0f1117" }}>{title} ({count})</span>
        <button onClick={onSeeAll} style={{ fontSize: 12, color: "#8a6510", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
          Open tab →
        </button>
      </div>
      {children}
    </div>
  );
}

function Row({ primary, secondary, status, onClick }: { primary: string; secondary: string; status: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "0.7rem 1.25rem", background: "none", border: "none", borderBottom: "1px solid rgba(15,17,23,.05)", cursor: "pointer", fontFamily: "inherit" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f8f7f4")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1117" }}>{primary}</div>
        <div style={{ fontSize: 11, color: "#9496a1" }}>{secondary}</div>
      </div>
      <StatusPill status={status} />
    </button>
  );
}
