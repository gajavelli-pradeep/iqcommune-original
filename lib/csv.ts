// Minimal, dependency-free CSV export for admin tables (client-side).

type Cell = string | number | boolean | null | undefined;

/** Escape a single CSV field per RFC 4180 (quote if it contains comma, quote, or newline). */
function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value) ? value.join("; ") : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from a header list and an array of row objects. */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T | ((row: T) => Cell); label: string }[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => escapeCell(typeof c.key === "function" ? c.key(row) : (row[c.key] as Cell)))
      .join(",")
  );
  return [header, ...body].join("\r\n");
}

/** Trigger a browser download of `content` as `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
