"use client";

import { useMemo, useState } from "react";
import { toCsv, downloadCsv } from "@/lib/csv";

export interface MasterDataPerson {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  city: string | null;
  state: string | null;
  communication_address: string | null;
  tshirt_size: string | null;
  // index signature so the row satisfies toCsv's Record<string, unknown> constraint
  [key: string]: unknown;
}

type SortKey = "name" | "phone" | "email" | "city" | "state";

const th: React.CSSProperties = {
  textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--ink-faint)", padding: "8px 12px", borderBottom: "1px solid rgba(20,18,12,.1)",
  whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
};
const td: React.CSSProperties = { fontSize: 13, color: "var(--ink)", padding: "9px 12px", borderBottom: "1px solid rgba(20,18,12,.06)" };
const field: React.CSSProperties = {
  padding: "7px 12px", border: "1px solid rgba(20,18,12,.18)", borderRadius: 6,
  fontFamily: "inherit", fontSize: 12.5, background: "var(--input-paper)", color: "var(--ink)", outline: "none",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#fff",
  border: "1px solid rgba(20,18,12,0.18)", borderRadius: 100, padding: "6px 12px",
  fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--ink)", fontFamily: "inherit",
};
const DownloadIcon = () => (
  <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/** Settings → Practitioner Master Data: offline-contact quick reference (V4). */
export function MasterDataTable({ practitioners }: { practitioners: MasterDataPerson[] }) {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cities = useMemo(() => [...new Set(practitioners.map((p) => p.city).filter(Boolean) as string[])].sort(), [practitioners]);
  const states = useMemo(() => [...new Set(practitioners.map((p) => p.state).filter(Boolean) as string[])].sort(), [practitioners]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = practitioners.filter((p) => {
      if (cityFilter && p.city !== cityFilter) return false;
      if (stateFilter && p.state !== stateFilter) return false;
      if (!q) return true;
      return [p.name, p.email, p.phone].some((v) => (v ?? "").toLowerCase().includes(q));
    });
    return filtered.sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === "asc" ? 1 : -1);
    });
  }, [practitioners, search, cityFilter, stateFilter, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }
  const arrow = (k: SortKey) => (k === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }
  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; });
  }

  function download(scope: "all" | "selected") {
    const source = scope === "selected" ? rows.filter((r) => selected.has(r.id)) : rows;
    if (source.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`practitioner-master-data-${stamp}.csv`, toCsv(source, [
      { key: "name", label: "Name" },
      { key: (r) => r.phone ?? "", label: "Phone" },
      { key: "email", label: "Email" },
      { key: (r) => r.city ?? "", label: "City" },
      { key: (r) => r.state ?? "", label: "State" },
    ]));
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid rgba(20,18,12,.10)", borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>Practitioner Master Data</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginBottom: "1rem", lineHeight: 1.6, maxWidth: 620 }}>
        Quick reference for offline contact — name, phone, email, city, and state.
        Full profiles (modules, experience, payment details) live under Practitioners.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <input
          type="text"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...field, flex: 1, minWidth: 200 }}
        />
        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ ...field, cursor: "pointer" }}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ ...field, cursor: "pointer" }}>
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{rows.length} of {practitioners.length}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{selected.size} selected</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...btnGhost, opacity: selected.size ? 1 : 0.5, cursor: selected.size ? "pointer" : "not-allowed" }} disabled={!selected.size} onClick={() => download("selected")}>
            <DownloadIcon /> Download selected
          </button>
          <button style={{ ...btnGhost, background: "var(--ink)", color: "#fff", border: "none" }} onClick={() => download("all")}>
            <DownloadIcon /> Download all
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid rgba(20,18,12,.08)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 28, cursor: "default" }}>
                <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" style={{ accentColor: "var(--gold)", cursor: "pointer" }} />
              </th>
              <th style={th} onClick={() => setSort("name")}>Name{arrow("name")}</th>
              <th style={th} onClick={() => setSort("phone")}>Phone{arrow("phone")}</th>
              <th style={th} onClick={() => setSort("email")}>Email{arrow("email")}</th>
              <th style={th} onClick={() => setSort("city")}>City{arrow("city")}</th>
              <th style={th} onClick={() => setSort("state")}>State{arrow("state")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: "var(--ink-faint)", padding: "1.75rem" }}>No practitioners match your search or filters.</td></tr>
            ) : rows.map((p) => (
              <tr key={p.id}>
                <td style={{ ...td, width: 28 }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggleOne(p.id, e.target.checked)} aria-label={`Select ${p.name}`} style={{ accentColor: "var(--gold)", cursor: "pointer" }} />
                </td>
                <td style={{ ...td, fontWeight: 500 }}>{p.name}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{p.phone ?? "—"}</td>
                <td style={{ ...td, color: "var(--ink-muted)" }}>{p.email}</td>
                <td style={td}>{p.city ?? "—"}</td>
                <td style={td}>{p.state ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
