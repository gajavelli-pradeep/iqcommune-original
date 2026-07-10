// Shared free-text row matcher for the admin tables' Filter-bar search box.
// Returns true when the (trimmed, lower-cased) query is a substring of ANY of
// the supplied column values — i.e. "search across all columns". An empty query
// matches everything. Pass each displayed column's value (arrays should be
// joined by the caller, e.g. `(p.modules ?? []).join(" ")`).
export function matchesSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}
