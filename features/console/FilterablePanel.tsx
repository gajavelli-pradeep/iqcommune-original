"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ConsoleTable, type ColumnDef } from "./ConsoleTable";
import { PeriodFilter, matchesPeriod, yearsIn } from "./PeriodFilter";
import { useRowFocus } from "./RowFocusContext";
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
  statuses = [],
  isPending,
  pendingLabel,
  periodOf,
  periodLabel = "Applied in:",
  expand,
  rowLabel,
}: {
  rows: readonly Row[];
  columns: ReadonlyArray<ColumnDef<Row>>;
  role: ConsoleRole;
  rowKey: (row: Row) => string;
  caption: string;
  empty: string;
  statusOf: (row: Row) => string;
  /** Status filter pills (V7 `.filter-bar`). Omit/empty to hide the bar. */
  statuses?: readonly StatusOption[];
  isPending: (row: Row) => boolean;
  pendingLabel: string;
  /** A "12 Jun 2025"-style date to filter on; omit to hide the period filter. */
  periodOf?: (row: Row) => string;
  periodLabel?: string;
  /** Returns the detail card a row opens (V7 `.profile-card`). */
  expand?: (row: Row) => ReactNode;
  /** Names a row for the expand control's screen-reader text. */
  rowLabel?: (row: Row) => string;
}) {
  const [status, setStatus] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  /**
   * A row the header search picked out of this panel.
   *
   * The filters are cleared when one arrives, and that is the whole reason this
   * lives here rather than in `ExpandableRows`: a search that finds a Cancelled
   * request while the panel is filtered to New would otherwise open a tab whose
   * table does not contain the row it just promised. Search answers about the
   * data, so it outranks a filter the operator set earlier.
   *
   * Reset during render against the nonce, not in an effect — an effect would
   * paint the filtered table first and correct it a frame later, which reads as
   * a flicker on exactly the interaction meant to feel direct.
   */
  const focus = useRowFocus();
  // 0 is never a real nonce, so a panel mounting WITH a focus already set (the
  // hit was on another tab) still treats it as new. See `ExpandableRows`.
  const [handled, setHandled] = useState(0);
  if (focus && focus.nonce !== handled) {
    setHandled(focus.nonce);
    setStatus("");
    setPendingOnly(false);
    setMonth("");
    setYear("");
  }
  const pendingCount = useMemo(() => rows.filter(isPending).length, [rows, isPending]);
  const years = useMemo(
    () => (periodOf ? yearsIn(rows.map(periodOf)) : []),
    [rows, periodOf],
  );
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (pendingOnly && !isPending(row)) return false;
        if (status && statusOf(row) !== status) return false;
        if (periodOf && !matchesPeriod(periodOf(row), month, year)) return false;
        return true;
      }),
    [rows, pendingOnly, status, month, year, statusOf, isPending, periodOf],
  );
  // V7 draws these small; the coarse-pointer minimums are added without
  // changing the drawn size on a mouse. `min-w-11` catches the short labels
  // ("All" is 43px wide, one pixel under the floor).
  const chip = (active: boolean) =>
    `rounded-full border px-[14px] py-[5px] text-sm font-medium transition-colors [@media(any-pointer:coarse)]:min-w-11 ${
      active
        ? "border-ink bg-ink text-surface"
        : "border-border-strong bg-surface text-ink-muted hover:border-gold hover:text-ink"
    }`;
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
          <PeriodFilter
            label={periodLabel}
            month={month}
            year={year}
            years={years}
            onMonth={setMonth}
            onYear={setYear}
            idPrefix="panel-period"
          />
        ) : null}
      </div>
      {/* V7 .filter-bar — status filter pills. Omitted where V7 has none. */}
      {statuses.length > 0 ? (
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
      ) : null}
      <ConsoleTable
        caption={caption}
        columns={columns}
        rows={filtered}
        role={role}
        rowKey={rowKey}
        empty={empty}
        expand={expand}
        rowLabel={rowLabel}
      />
    </>
  );
}
