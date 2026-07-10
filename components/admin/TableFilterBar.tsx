"use client";

import { useEffect, useRef, useState } from "react";
import { MONTHS } from "@/lib/admin/use-date-filter";

// Shared "Filter:" chip bar shown above every admin table (replaces the old
// per-tab stat-card rows). One data-driven component — pass the status options
// for the table. Optional search box renders on the right when onSearchChange
// is supplied. Optional `dateFilter` adds a calendar icon that opens a Year +
// Month picker (the table applies it to its own primary date column). Pair with
// <AdminTable connected /> (or a wrapper whose top corners are square) so the
// frame continues from the bar into the table.

export interface DateFilterControl {
  year: string;
  month: string;
  years: number[];
  active: boolean;
  label: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  onClear: () => void;
}

export function TableFilterBar({
  options,
  value,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateFilter,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateFilter?: DateFilterControl;
}) {
  return (
    <div style={barStyle}>
      <span style={labelStyle}>Filter:</span>
      {options.map((f) => {
        const isActive = value === f;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            aria-pressed={isActive}
            style={chipStyle(isActive)}
          >
            {f}
          </button>
        );
      })}
      {onSearchChange && (
        <div style={{ flex: 1, minWidth: 160 }}>
          <input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={searchStyle}
          />
        </div>
      )}
      {dateFilter && <DateFilterMenu dateFilter={dateFilter} pushRight={!onSearchChange} />}
    </div>
  );
}

// ── Calendar icon → Year + Month popover ─────────────────────────────────────
function DateFilterMenu({ dateFilter, pushRight }: { dateFilter: DateFilterControl; pushRight: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const active = dateFilter.active;

  return (
    <div ref={rootRef} style={{ position: "relative", marginLeft: pushRight ? "auto" : undefined }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filter by year and month"
        aria-expanded={open}
        title="Filter by year / month"
        style={iconBtnStyle(active || open)}
      >
        <CalendarIcon />
        {active && <span style={{ whiteSpace: "nowrap" }}>{dateFilter.label}</span>}
      </button>

      {open && (
        <div role="dialog" aria-label="Year and month filter" style={popoverStyle}>
          <label style={fieldLabelStyle}>
            Year
            <select value={dateFilter.year} onChange={(e) => dateFilter.onYear(e.target.value)} style={selectStyle}>
              <option value="">All years</option>
              {dateFilter.years.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </label>
          <label style={fieldLabelStyle}>
            Month
            <select value={dateFilter.month} onChange={(e) => dateFilter.onMonth(e.target.value)} style={selectStyle}>
              <option value="">All months</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </label>
          {active && (
            <button type="button" onClick={dateFilter.onClear} style={clearBtnStyle}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const barStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(20,18,12,.10)",
  borderRadius: "10px 10px 0 0",
  borderBottom: "none",
  padding: ".75rem 1.25rem",
  display: "flex",
  alignItems: "center",
  gap: ".75rem",
  flexWrap: "wrap",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ink-faint)",
  whiteSpace: "nowrap",
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 14px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 500,
    border: active ? "1px solid var(--ink)" : "1px solid rgba(20,18,12,.18)",
    cursor: "pointer",
    background: active ? "var(--ink)" : "#fff",
    color: active ? "#fff" : "var(--ink-soft)",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  };
}

const searchStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(20,18,12,.15)",
  background: "#f8f7f4",
  fontFamily: "inherit",
  outline: "none",
};

function iconBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    padding: "5px 12px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
    border: active ? "1px solid var(--gold)" : "1px solid rgba(20,18,12,.18)",
    background: active ? "var(--gold-light)" : "#fff",
    color: active ? "var(--gold-dark)" : "var(--ink-soft)",
    whiteSpace: "nowrap",
  };
}

const popoverStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 180,
  padding: 12,
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,.12)",
  borderRadius: 10,
  boxShadow: "0 14px 36px -14px rgba(20,16,10,0.28), 0 2px 6px rgba(20,16,10,0.06)",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--ink-faint)",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
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

const clearBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid rgba(20,18,12,.18)",
  background: "#fff",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "inherit",
  color: "var(--ink-soft)",
  cursor: "pointer",
};
