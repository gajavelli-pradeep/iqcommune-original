"use client";

import { useEffect } from "react";

import { saveTab } from "@/lib/consoleCache";

export interface TabRead {
  tabId: string;
  rows: readonly unknown[] | null;
  failed: boolean;
}

/**
 * Mirrors every tab's rows into the client cache, mounted once and
 * unconditionally — regardless of which tab is currently open.
 *
 * `loadConsolePanels` fetches all 8 simple-row tabs on every request, but
 * `ConsoleShell` only ever renders the ACTIVE tab's panel — the other seven
 * `CachedPanel` instances that `panels` holds are built but never mounted, so
 * a save-on-success effect scoped to `CachedPanel` only ever fires for
 * whichever tab happens to be open. An admin who lives on Practitioners and
 * never opens Payouts would find Payouts with nothing to fall back to the
 * day its own read fails — this runs for all of them every time, so every
 * tab has a same-session fallback the first time the console loads clean,
 * not only the ones someone happened to click into.
 */
export function CacheAllTabs({ tabs }: { tabs: readonly TabRead[] }) {
  useEffect(() => {
    for (const tab of tabs) {
      if (!tab.failed && tab.rows) void saveTab(tab.tabId, tab.rows);
    }
  }, [tabs]);

  return null;
}
