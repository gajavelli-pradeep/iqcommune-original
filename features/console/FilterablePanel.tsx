"use client";

import { useMemo, useState } from "react";

import { ConsoleTable, type ColumnDef } from "./ConsoleTable";
import type { ConsoleRole } from "./roles";

/**
 * A console panel with the V7 toolbar above the table: a clickable pending
 * stat-card, a status filter-pill row, and an optional period (month/year)
 * filter — all client-side over the rows the panel was given.
 *
 * It renders ConsoleTable itself (rather than taking a render prop) so the
 * whole thing lives on one side of the RSC boundary: the columns carry
 * server-action-bound row actions, which only a client component may hold.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface StatusOption {
  /** The raw status value to match against `statusOf`. */
  value: string;
  /** The pill label (may differ in casing from the value). */
  label: string;
}

export function FilterablePanel<Row>({
  rows,
  columns,
  role,
  rowKey,
  caption,
  empty,
  statusOf,
  statuses,
  isPending,
  pendingLabel,
  periodOf,
  periodLabel = "Applied in:",
}: {
  rows: readonly Row[];
  columns: ReadonlyArray<ColumnDef<Row>>;
  role: ConsoleRole;
  rowKey: (row: Row) => string;
  caption: string;
  empty: string;
  statusOf: (row: Row) => string;
  statuses: readonly StatusOption[];
  isPending: (row: Row) => boolean;
  pendingLabel: string;
  /** A "12 Jun 2025"-style date to filter on; omit to hide the period filter. */
  periodOf?: (row: Row) => string;
  periodLabel?: string;
}) {
  const [status, setStatus] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const pendingCount = useMemo(() => rows.filter(isPending).length, [rows, isPending]);

  const years = useMemo(() => {
    if (!periodOf) return [] as string[];
    const found = new Set<string>();
    for (const row of rows) {
      const match = periodOf(row).match(/\d{4}/);
      if (match) found.add(match[0]);
    }
    return [...found].sort().reverse();
  }, [rows, periodOf]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (pendingOnly && !isPending(row)) return false;
        if (status && statusOf(row) !== status) return false;
        if (periodOf) {
          const period = periodOf(row);
          if (year && !period.includes(year)) return false;
          if (month && !period.includes(month)) return false;
        }
        return true;
      }),
    [rows, pendingOnly, status, month, year, statusOf, isPending, periodOf],
  );

  const chip = (active: boolean) =>
    `rounded-full border px-[14px] py-[5px] text-sm font-medium transition-colors ${
      active
        ? "border-ink bg-ink text-surface"
        : "border-border-strong bg-surface text-ink-muted hover:border-gold hover:text-ink"
    }`;

  const select =
    "rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold";

  return (
    <>
      {/* V7 .pending-bar — a clickable pending stat-card and the period filter. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <button
          type="button"
          aria-pressed={pendingOnly}
          onClick={() => setPendingOnly((only) => !only)}
          className={`min-w-[120px] rounded-lg border bg-red-light px-4 py-2 text-left transition-[box-shadow,border-color] ${
            pendingOnly ? "border-red shadow-[0_0_0_2px_rgba(192,57,43,0.18)]" : "border-red/30 hover:border-red"
          }`}
        >
          <span className="block text-4xl font-bold leading-[1.1] text-red">{pendingCount}</span>
          <span className="block text-xs text-ink-muted">{pendingLabel}</span>
          {pendingOnly ? (
            <span className="mt-[3px] block text-3xs font-semibold text-red">✓ showing only this</span>
          ) : null}
        </button>

        {periodOf ? (
          <div className="flex items-center gap-1.5">
            <span className="mr-0.5 text-xs text-ink-faint">{periodLabel}</span>
            <label className="sr-only" htmlFor="period-month">
              Month
            </label>
            <select id="period-month" value={month} onChange={(e) => setMonth(e.target.value)} className={select}>
              <option value="">All months</option>
              {MONTHS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="period-year">
              Year
            </label>
            <select id="period-year" value={year} onChange={(e) => setYear(e.target.value)} className={select}>
              <option value="">All years</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* V7 .filter-bar — status filter pills. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-ink-faint">Filter:</span>
        <button type="button" onClick={() => setStatus("")} className={chip(status === "")}>
          All
        </button>
        {statuses.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={chip(status === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ConsoleTable
        caption={caption}
        columns={columns}
        rows={filtered}
        role={role}
        rowKey={rowKey}
        empty={empty}
      />
    </>
  );
}
