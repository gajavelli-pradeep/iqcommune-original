"use client";

import { MONTHS } from "@/lib/admin/use-date-filter";
import type { DateFilterControl } from "@/components/admin/TableFilterBar";

// V5 prototype table toolbar (`.pending-bar`): clickable pending stat-card(s) +
// Month/Year dropdowns on the first row, and — when a table supplies status
// options — a V5-style status **chip row** beneath it. This yields the client's
// three-layer stack on every table: ① cards + period · ② status chips · ③ table.
//
// One data-driven component (CLAUDE.md): every *Table passes its own statusOptions
// + value + onChange, so all tables render an identical chip row from different
// data — never seven copies.
//
// Colour notes (globals.css / CLAUDE.md tokens):
//  · pending cards tint AMBER — red is reserved for true failures, amber for
//    routine "needs action" counts (the V5 prototype's red is remapped).
//  · active chip = ink fill + surface label (never raw white-on-ink).

export interface PendingCardData {
  count: number;
  label: string;
  active: boolean;
  onToggle: () => void;
  /** Optional display override for the big number — e.g. a formatted ₹ amount
   *  ("Amount pending" card). Falls back to `count` when absent. */
  display?: string;
}

export function PendingBar({
  pendingCards,
  statusOptions,
  statusValue,
  onStatusChange,
  statusAriaLabel = "Filter by status",
  dateFilter,
  dateLabel,
  standalone = false,
}: {
  pendingCards: PendingCardData[];
  statusOptions?: readonly string[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusAriaLabel?: string;
  dateFilter?: DateFilterControl;
  /** V5 context label shown before the month/year selects, e.g. "Applied in:",
   *  "Received in:", "Session date:". Matches the mockup's labelled period filter. */
  dateLabel?: string;
  /** Render as a self-contained rounded bar (fully rounded + bottom border)
   *  instead of the default top-of-table style — used when content sits between
   *  the filter bar and the table (e.g. the consent tab's generate card). */
  standalone?: boolean;
}) {
  // Layer ② renders only when the table wired up a status filter.
  const showChips = !!(statusOptions && statusValue !== undefined && onStatusChange);

  return (
    <div style={standalone ? standaloneBarStyle : barStyle}>
      {/* Row ① — pending stat cards (left) + period filter (right) */}
      <div style={topRowStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {pendingCards.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.onToggle}
              aria-pressed={c.active}
              style={cardStyle(c.active)}
            >
              <span style={numStyle}>{c.display ?? c.count}</span>
              <span style={cardLabelStyle}>{c.label}</span>
              {c.active && <span style={showingStyle}>✓ showing only this</span>}
            </button>
          ))}
        </div>

        {dateFilter && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
            {dateLabel && <span style={dateLabelStyle}>{dateLabel}</span>}
            <select
              value={dateFilter.month}
              onChange={(e) => dateFilter.onMonth(e.target.value)}
              aria-label="Filter by month"
              style={selectStyle}
            >
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={dateFilter.year}
              onChange={(e) => dateFilter.onYear(e.target.value)}
              aria-label="Filter by year"
              style={selectStyle}
            >
              <option value="">All years</option>
              {dateFilter.years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row ② — V5 status chips (only when the table supplies options) */}
      {showChips && (
        <div role="group" aria-label={statusAriaLabel} style={chipRowStyle}>
          {statusOptions!.map((o) => {
            const active = statusValue === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => onStatusChange!(o)}
                aria-pressed={active}
                style={chipStyle(active)}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--ink)"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "rgba(20,18,12,.18)"; e.currentTarget.style.color = "var(--ink-soft)"; } }}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const barStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,.10)",
  borderRadius: "10px 10px 0 0",
  borderBottom: "none",
  padding: ".85rem 1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.85rem",
};

// Row ① — cards left, period filter right.
const topRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
};

// Row ② — status chips.
const chipRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 14px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    border: `1px solid ${active ? "var(--ink)" : "rgba(20,18,12,.18)"}`,
    background: active ? "var(--ink)" : "var(--surface)",
    color: active ? "var(--surface)" : "var(--ink-soft)",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "background .15s, border-color .15s, color .15s",
  };
}

// Standalone variant: fully rounded with a bottom border, for when the filter bar
// is not directly glued to the table (content sits between them).
const standaloneBarStyle: React.CSSProperties = {
  ...barStyle,
  borderRadius: 10,
  borderBottom: "1px solid rgba(20,18,12,.10)",
  marginBottom: "1.5rem",
};

function cardStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    background: "var(--amber-light)",
    border: `1px solid ${active ? "var(--amber)" : "var(--amber)"}`,
    boxShadow: active ? "0 0 0 2px var(--amber-light)" : "none",
    outline: active ? "1px solid var(--amber)" : "none",
    borderRadius: 8,
    padding: "8px 16px",
    minWidth: 120,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "box-shadow .15s, border-color .15s",
  };
}

const numStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "var(--amber)",
  lineHeight: 1.1,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ink-soft)",
  marginTop: 2,
};

const showingStyle: React.CSSProperties = {
  fontSize: 9.5,
  fontWeight: 600,
  color: "var(--amber)",
  marginTop: 3,
};

const dateLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ink-faint)",
  whiteSpace: "nowrap",
};

const selectStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid rgba(20,18,12,.18)",
  background: "var(--input-paper)",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--ink)",
  cursor: "pointer",
  outline: "none",
};
