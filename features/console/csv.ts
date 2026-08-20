/**
 * CSV encoding + browser download, for the console's Export action.
 *
 * RFC 4180 quoting: a value is wrapped in quotes only when it needs it (holds
 * a comma, quote, or newline), and an embedded quote doubles. Column headers
 * are quoted by the same rule — a header can carry a comma too ("City, State"
 * would otherwise misparse in Excel).
 *
 * Formula-injection guard: several of these columns are free text a
 * requester or practitioner typed themselves (notes, organisation, venue) —
 * untrusted input that reaches this file unvalidated. Excel/Sheets treat a
 * cell starting with =, +, -, or @ as a formula, so `=cmd|'/c calc'!A1` typed
 * into a notes field becomes code execution the moment an admin opens the
 * export. Tab and carriage return are in the same OWASP-documented trigger
 * set — different spreadsheet parsers disagree on which of the six actually
 * fire, so all six are neutralised rather than only the two that happen to
 * be visible ASCII. A leading apostrophe forces text interpretation in both
 * Excel and Sheets, and is itself untouched by RFC 4180 quoting, so it has
 * to be applied first.
 */
function escapeCsvValue(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
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
