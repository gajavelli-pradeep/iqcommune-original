/**
 * The console's global search — the index, the matcher, and the contract for
 * jumping to a result.
 *
 * V7 declares this control and does not implement it: `globalSearch(q)` is
 * `showToast('Searching for "'+q+'"…')`. A box that accepts a query and answers
 * with a toast is worse than no box, because it teaches an operator that the
 * console has no search when what it has is an unfinished one.
 *
 * The index is built on the server from the rows the panels were ALREADY
 * rendered from (`loadPanels`), which is the whole reason this is cheap: no
 * second query, no new endpoint, and no way to leak. A role that cannot load a
 * panel contributes no entries from it, so authorisation is inherited from the
 * read rather than reimplemented here — the failure mode where a search box
 * happily finds records its viewer may not open cannot occur.
 *
 * SCALE. Matching is a linear scan over rows held in memory. At today's volume
 * (hundreds) it is imperceptible, and at ten times that it still is. The cliff
 * is around a few thousand rows per role, where the payload itself — not the
 * scan — becomes the cost. Past that, this moves behind an endpoint with a
 * Postgres trigram index and the component keeps its shape: it already talks to
 * `matchHits`, so only the source of the hits changes.
 */

/** Where a hit lives and what to show for it. */
export interface SearchHit {
  /** Console tab id to open — must be a tab the role actually has. */
  tab: string;
  /** The row's key within that panel, as `FilterablePanel`'s `rowKey` returns. */
  rowKey: string;
  /** Primary line — a person, an organisation, a reference. */
  title: string;
  /** Secondary line: what kind of record this is, and its status. */
  subtitle: string;
  /**
   * Everything matchable about the row, lowercased and space-joined.
   *
   * Precomputed on the server so a keystroke costs one `includes` per row
   * instead of rebuilding and re-lowercasing every field of every row.
   */
  terms: string;
}

/** Builds a hit, folding the searchable fields into `terms`. */
export function hit(
  tab: string,
  rowKey: string,
  title: string,
  subtitle: string,
  fields: ReadonlyArray<string | number | null | undefined>,
): SearchHit {
  const terms = [title, subtitle, ...fields]
    .filter((value): value is string | number => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();

  return { tab, rowKey, title, subtitle, terms };
}

/** Below this a query matches most of the index and the list is noise. */
export const MIN_QUERY = 2;

/** How many hits the dropdown shows at once. */
export const MAX_HITS = 8;

export interface SearchResult {
  hits: readonly SearchHit[];
  /**
   * How many matches were NOT shown.
   *
   * Surfaced in the UI rather than dropped silently: a list capped at eight
   * that looks complete is how an operator concludes a record does not exist.
   */
  overflow: number;
}

/**
 * Case-insensitive AND-match: every whitespace-separated word must appear
 * somewhere in the row.
 *
 * AND rather than OR because the words an operator types are a narrowing
 * description of one record ("priya mumbai"), not alternatives. OR would rank
 * every Mumbai row alongside the one they meant.
 */
export function matchHits(index: readonly SearchHit[], query: string): SearchResult {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 || query.trim().length < MIN_QUERY) {
    return { hits: [], overflow: 0 };
  }

  const found = index.filter((entry) => words.every((word) => entry.terms.includes(word)));
  return { hits: found.slice(0, MAX_HITS), overflow: Math.max(0, found.length - MAX_HITS) };
}

/**
 * The row a search result asked the console to open.
 *
 * Carries a `nonce` because selecting the SAME result twice must still work.
 * Without it the second selection is an identical value, React re-renders
 * nothing, and the panel — which the operator may have since collapsed — stays
 * shut. The nonce makes every selection a distinct event.
 */
export interface RowFocus {
  tab: string;
  rowKey: string;
  nonce: number;
}
