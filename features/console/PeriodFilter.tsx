"use client";

import { selectClass } from "@/components/ui/control";

/**
 * The month/year filter that sits at the right of a panel's pending bar
 * (V7 `.period-filter`).
 *
 * Extracted at the second use rather than the first: `FilterablePanel` owns it
 * for the panels built on that, and the Photos tab needs the same control
 * beside its own pair of pending cards. Two copies would drift on the label
 * wording and the "All months" empty option.
 *
 * It filters on the RENDERED date string ("14 Aug 2026") because that is what
 * the rows carry — the panels format dates in the service layer, so a month is
 * matched by name rather than by parsing back into a Date.
 */

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** True when a rendered date falls in the selected month and year. */
export function matchesPeriod(rendered: string, month: string, year: string): boolean {
  if (year && !rendered.includes(year)) return false;
  if (month && !rendered.includes(month)) return false;
  return true;
}

/** The distinct years present in a set of rendered dates, newest first. */
export function yearsIn(dates: readonly string[]): string[] {
  const found = new Set<string>();
  for (const value of dates) {
    const match = value.match(/\d{4}/);
    if (match) found.add(match[0]);
  }
  return [...found].sort().reverse();
}

/** The pending bar sits on the page, so its filters use the inline family. */
const SELECT = selectClass({ tone: "inline", className: "w-auto" });

export function PeriodFilter({
  label,
  month,
  year,
  years,
  onMonth,
  onYear,
  idPrefix,
}: {
  label: string;
  month: string;
  year: string;
  years: readonly string[];
  onMonth: (value: string) => void;
  onYear: (value: string) => void;
  /** Keeps the two selects' ids unique when a page shows more than one filter. */
  idPrefix: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-0.5 text-xs text-ink-faint">{label}</span>

      <label className="sr-only" htmlFor={`${idPrefix}-month`}>
        Month
      </label>
      <select
        id={`${idPrefix}-month`}
        value={month}
        onChange={(event) => onMonth(event.target.value)}
        className={SELECT}
      >
        <option value="">All months</option>
        {MONTHS.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor={`${idPrefix}-year`}>
        Year
      </label>
      <select
        id={`${idPrefix}-year`}
        value={year}
        onChange={(event) => onYear(event.target.value)}
        className={SELECT}
      >
        <option value="">All years</option>
        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}
