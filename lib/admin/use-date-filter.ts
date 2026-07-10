"use client";

import { useState } from "react";

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/**
 * Year + month filter shared by every admin table's Filter bar. Pass the list of
 * date strings that appear in the table (the column the filter should act on);
 * `years` is derived from them (descending, distinct). `matchesDate(d)` is the
 * predicate each table applies to its own rows. `year`/`month` are "" when unset
 * ("All"); month is "1".."12".
 */
export function useDateFilter(dates: Array<string | null | undefined>) {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");

  const seen = new Set<number>();
  for (const d of dates) {
    if (!d) continue;
    const y = new Date(d).getFullYear();
    if (!Number.isNaN(y)) seen.add(y);
  }
  const years = [...seen].sort((a, b) => b - a);

  const active = year !== "" || month !== "";

  function matchesDate(d: string | null | undefined): boolean {
    if (!active) return true;
    if (!d) return false;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return false;
    if (year !== "" && dt.getFullYear() !== Number(year)) return false;
    if (month !== "" && dt.getMonth() + 1 !== Number(month)) return false;
    return true;
  }

  const label = active
    ? [month !== "" ? MONTHS[Number(month) - 1] : null, year !== "" ? year : null]
        .filter(Boolean)
        .join(" ")
    : "";

  function clear() {
    setYear("");
    setMonth("");
  }

  // Ready-made prop for <TableFilterBar dateFilter={...} /> (matches DateFilterControl).
  const control = { year, month, years, active, label, onYear: setYear, onMonth: setMonth, onClear: clear };

  return { year, month, setYear, setMonth, years, active, matchesDate, label, clear, control };
}
