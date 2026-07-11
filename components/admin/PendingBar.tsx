"use client";

import { MONTHS } from "@/lib/admin/use-date-filter";
import type { DateFilterControl } from "@/components/admin/TableFilterBar";

// V5 prototype table toolbar (`.pending-bar`): clickable pending stat-card(s) on the
// left, Month + Year dropdowns on the right, with an optional minimal status <select>.
// Replaces the chip + search + calendar-popover TableFilterBar per client design.
//
// Colour note: the prototype tints pending cards red. This app's colour system
// (globals.css / CLAUDE.md) reserves red for failures and uses AMBER for routine
// "needs action" counts — so the cards are amber here.

export interface PendingCardData {
  count: number;
  label: string;
  active: boolean;
  onToggle: () => void;
}

export function PendingBar({
  pendingCards,
  statusOptions,
  statusValue,
  onStatusChange,
  statusAriaLabel = "Filter by status",
  dateFilter,
}: {
  pendingCards: PendingCardData[];
  statusOptions?: readonly string[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusAriaLabel?: string;
  dateFilter?: DateFilterControl;
}) {
  return (
    <div style={barStyle}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pendingCards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.onToggle}
            aria-pressed={c.active}
            style={cardStyle(c.active)}
          >
            <span style={numStyle}>{c.count}</span>
            <span style={cardLabelStyle}>{c.label}</span>
            {c.active && <span style={showingStyle}>✓ showing only this</span>}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
        {statusOptions && onStatusChange && (
          <select
            value={statusValue}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label={statusAriaLabel}
            style={selectStyle}
          >
            {statusOptions.map((o) => (
              <option key={o} value={o}>{o === "All" ? "All statuses" : o}</option>
            ))}
          </select>
        )}
        {dateFilter && (
          <>
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
          </>
        )}
      </div>
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
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
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
