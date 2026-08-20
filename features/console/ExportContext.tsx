"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * The current tab's exportable data, published by whichever panel is mounted.
 *
 * The Export button lives in `ConsoleShell`'s shared page header, outside any
 * panel — but only a panel knows its own currently-filtered rows (the status
 * pills and period filter are `FilterablePanel`'s own client state, never
 * lifted to the shell). A context carrying a setter, rather than the payload
 * itself, is what lets data flow the *other* direction from `RowFocusContext`:
 * up from the panel that has it, to the header that needs it.
 */
export interface ExportPayload {
  filename: string;
  headers: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}

type SetExport = (payload: ExportPayload | null) => void;

const ExportContext = createContext<SetExport | null>(null);

export function ExportProvider({
  setExport,
  children,
}: {
  setExport: SetExport;
  children: ReactNode;
}) {
  return <ExportContext.Provider value={setExport}>{children}</ExportContext.Provider>;
}

/**
 * Publishes `payload` as the header's export target for as long as this panel
 * is mounted, and withdraws it on unmount — the shell clears its own copy on
 * every tab switch too (belt and braces: a panel that unmounts mid-fetch must
 * not leave a stale export behind on the tab that replaces it).
 */
export function usePublishExport(payload: ExportPayload | null): void {
  const setExport = useContext(ExportContext);
  useEffect(() => {
    setExport?.(payload);
    return () => setExport?.(null);
  }, [setExport, payload]);
}
