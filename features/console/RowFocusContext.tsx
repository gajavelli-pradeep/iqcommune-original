"use client";

import { createContext, useContext, useEffect, type RefObject } from "react";

import type { RowFocus } from "./search";

/**
 * The row the header search asked the current panel to open.
 *
 * A context rather than a prop because the panels are server-rendered nodes:
 * `loadConsolePanels` builds them before `ConsoleShell` runs, so there is no
 * moment at which the shell could pass them anything. They render *inside* the
 * provider, though, which is all a client component needs to read it.
 *
 * Null whenever the focused row belongs to a different tab — the shell narrows
 * it before providing, so a panel never has to ask whether a target is its own.
 */
export const RowFocusContext = createContext<RowFocus | null>(null);

export function useRowFocus(): RowFocus | null {
  return useContext(RowFocusContext);
}

/**
 * The focus target this table owns, scrolled into view.
 *
 * Shared by both kinds of console table — the expandable ones (Practitioners,
 * Requests) and the flat ones (Agreements, Sessions) — because "find the row
 * and put it where the operator can see it" is the same job in both. Only what
 * happens NEXT differs: one opens a detail card, the other highlights.
 *
 * `owns` guards against a stale target: after a search moves the console to
 * another tab, the previous panel unmounts, but during the render in between a
 * table can briefly see a key that is not its own.
 */
export function useFocusedRow(
  container: RefObject<HTMLElement | null>,
  owns: (rowKey: string) => boolean,
): RowFocus | null {
  const focus = useRowFocus();
  const targeted = focus && owns(focus.rowKey) ? focus : null;
  const nonce = targeted?.nonce;
  const rowKey = targeted?.rowKey;

  useEffect(() => {
    if (!rowKey) return;
    const row = container.current?.querySelector(`[data-row-key="${CSS.escape(rowKey)}"]`);
    // `center`, not the default `start`: the console header is sticky, and a
    // row aligned to the top of the scroll port sits underneath it.
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
    // `nonce` is a dependency so that picking the SAME row twice scrolls again
    // — the operator may have scrolled away in between.
  }, [container, rowKey, nonce]);

  return targeted;
}
