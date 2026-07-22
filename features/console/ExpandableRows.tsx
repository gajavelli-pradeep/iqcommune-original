"use client";

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The console's dominant interaction: click a table row, a full-width detail
 * card opens beneath it, and opening another closes the first.
 *
 * V7 does this with `onclick` on the `<tr>` and a single `prSelected` id. The
 * single-open behaviour is kept exactly — it is what makes the panel readable
 * with fifty rows — but the affordance is not: a click handler on a `<tr>` is
 * unreachable by keyboard and announces nothing. Here the row's first cell
 * carries a real `<button>` that owns `aria-expanded`/`aria-controls` and
 * inherits its typography, so it looks identical and is tabbable; the rest of
 * the row stays mouse-clickable so the target is still the whole row.
 */

export interface ExpandableCell {
  key: string;
  className: string;
  node: ReactNode;
}

export interface ExpandableRowSpec {
  key: string;
  /** Names the row for a screen reader — "Priya Sharma" reads better than "Row 3". */
  label: string;
  cells: readonly ExpandableCell[];
  detail: ReactNode;
}

/**
 * Lets the close button inside a detail card reach the table's open state.
 * The card is rendered in a *sibling* row, so a click there never bubbles to
 * the row that opened it — the obvious-looking alternative silently does
 * nothing. Context also keeps `detail` a plain node, so a server component can
 * still build it.
 */
const CloseDetail = createContext<(() => void) | null>(null);

/**
 * The visible width of the horizontal scroll container the table sits in.
 *
 * The detail card must not inherit the table's min-width: the table is
 * deliberately wider than a phone (five columns cannot crush to 320px) and
 * scrolls sideways, but the card is not columnar data, and at the table's width
 * its right-hand edge — the actions, the Notes button — sits off screen behind
 * that scroll.
 *
 * This is measured rather than expressed in CSS because the honest CSS answers
 * do not work here: `100dvw` ignores the page's own padding, and any `%`/`full`
 * width is circular — the card is what makes the cell wide, so it would be
 * measuring itself. `null` until measured, so the first paint uses the safe
 * fallback instead of a wrong number.
 */
function useScrollViewportWidth(anchor: React.RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const start = anchor.current;
    if (!start) return;

    let container: HTMLElement | null = start.parentElement;
    while (container) {
      const overflowX = getComputedStyle(container).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") break;
      container = container.parentElement;
    }
    if (!container) return;

    const measure = () => setWidth(container.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [anchor]);

  return width;
}

export function ExpandableRows({
  rows,
  colSpan,
}: {
  rows: readonly ExpandableRowSpec[];
  colSpan: number;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const idPrefix = useId();
  const body = useRef<HTMLTableSectionElement>(null);
  const viewport = useScrollViewportWidth(body);

  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key));
  const close = () => setOpenKey(null);

  return (
    <tbody ref={body}>
      {rows.map((row) => {
        const open = openKey === row.key;
        const detailId = `${idPrefix}-${row.key}`;

        return (
          <Fragment key={row.key}>
            <tr
              onClick={() => toggle(row.key)}
              className={`cursor-pointer border-b border-border transition-colors ${
                open ? "bg-row-selected" : "hover:bg-surface-soft"
              }`}
            >
              {row.cells.map((cell, index) => (
                <td key={cell.key} className={cell.className}>
                  {index === 0 ? (
                    // The toggle wraps the first cell rather than sitting beside
                    // it: V7 has no visible control, the row itself is the
                    // control, and an extra chevron would be an invented variant.
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={open ? detailId : undefined}
                      onClick={(event) => {
                        // The row's own handler would fire second and toggle
                        // straight back.
                        event.stopPropagation();
                        toggle(row.key);
                      }}
                      className="w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      <span className="sr-only">
                        {open ? `Hide details for ${row.label}` : `Show details for ${row.label}`}
                      </span>
                      {cell.node}
                    </button>
                  ) : (
                    cell.node
                  )}
                </td>
              ))}
            </tr>

            {open ? (
              <tr>
                <td
                  id={detailId}
                  colSpan={colSpan}
                  className="border-b border-t-2 border-b-border border-t-gold bg-surface p-0"
                >
                  {/* `sticky left-0` pins the card to the visible edge as the
                      table scrolls sideways; the measured width keeps it inside
                      that edge. See `useScrollViewportWidth`. */}
                  <div
                    className="sticky left-0"
                    style={viewport ? { width: viewport } : undefined}
                  >
                    <CloseDetail.Provider value={close}>{row.detail}</CloseDetail.Provider>
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </tbody>
  );
}

/** The detail card's close button (V7 `.prof-close`). */
export function DetailClose({ label }: { label: string }) {
  const close = useContext(CloseDetail);

  return (
    <button
      type="button"
      onClick={close ?? undefined}
      aria-label={`Close details for ${label}`}
      /* V7 `.prof-close` is a 32px circle; the pseudo-element carries the 44px
         tap area on touch so the drawn circle stays 32px. */
      className="absolute right-5 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-soft text-base text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']"
    >
      <span aria-hidden>✕</span>
    </button>
  );
}
