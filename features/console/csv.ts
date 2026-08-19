/**
 * CSV encoding + browser download, for the console's Export action.
 *
 * RFC 4180 quoting: a value is wrapped in quotes only when it needs it (holds
 * a comma, quote, or newline), and an embedded quote doubles. Column headers
 * are quoted by the same rule — a header can carry a comma too ("City, State"
 * would otherwise misparse in Excel).
 */
function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly string[]>): string {
  const lines = [headers, ...rows].map((line) => line.map(escapeCsvValue).join(","));
  // CRLF: the RFC's own line ending, and what keeps Excel from mis-detecting
  // the encoding on a file with no other CRLF-vs-LF signal.
  return lines.join("\r\n");
}

/** Triggers a real browser download — no server round trip, the rows are
 *  already in the client from whichever filter is currently applied. */
export function downloadCsv(filename: string, headers: readonly string[], rows: ReadonlyArray<readonly string[]>): void {
  const csv = toCsv(headers, rows);
  // BOM so Excel opens UTF-8 correctly instead of guessing Latin-1 on the
  // first non-ASCII character (a practitioner's name, a city).
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
