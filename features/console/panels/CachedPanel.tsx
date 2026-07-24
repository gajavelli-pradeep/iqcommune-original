"use client";

import { useEffect, useState } from "react";

import { loadTab } from "@/lib/consoleCache";

import type { ConsoleRole } from "../roles";
import { PanelError } from "./PanelError";
import { PANEL_RENDERERS, type PanelExtra } from "./renderers";

/** Simple minutes/hours/days-ago phrasing for the cache note — no date
 *  library is installed, and the note doesn't need one. */
function relativeTime(from: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - from) / 1000));
  if (seconds < 60) return "moments ago";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type Cached = { rows: readonly unknown[]; savedAt: number } | null;

/**
 * Decides live vs. cached vs. empty for one console tab.
 *
 * `loadPanels.tsx` no longer renders these 8 tabs itself — it hands over the
 * raw rows (or `null` on a failed read) and lets this client component decide
 * what to show, because only the client can reach the IndexedDB cache. The
 * actual panel markup is `PANEL_RENDERERS`, shared with nothing else — there
 * is nothing else that renders these panels — so a live read and a cached one
 * always look identical apart from the note above them.
 *
 * Writing to the cache is NOT this component's job, deliberately — only the
 * active tab ever mounts one of these, so a save-on-success effect here would
 * only ever cache whichever tab happens to be open. `CacheAllTabs` does that
 * for every tab, mounted once regardless of which is active.
 */
export function CachedPanel({
  tabId,
  role,
  rows,
  failed,
  extra,
}: {
  tabId: string;
  role: ConsoleRole;
  /** Null when the live read failed — nothing fresh to render or cache. */
  rows: readonly unknown[] | null;
  failed: boolean;
  extra?: PanelExtra;
}) {
  // undefined = still checking the cache; null = checked, nothing there.
  const [cached, setCached] = useState<Cached | undefined>(undefined);

  useEffect(() => {
    if (!failed) return;

    let cancelled = false;
    void loadTab<readonly unknown[]>(tabId).then((result) => {
      if (!cancelled) setCached(result);
    });
    return () => {
      cancelled = true;
    };
  }, [tabId, failed]);

  const render = PANEL_RENDERERS[tabId];

  if (!failed) {
    return rows ? <>{render(rows, role, extra ?? {})}</> : null;
  }

  // Resolves near-instantly (IndexedDB, not a network read) — no dedicated
  // loading UI is worth building for this window.
  if (cached === undefined) return null;

  if (cached === null) {
    return <PanelError message="This section couldn't load, and there's no saved data yet." />;
  }

  return (
    <div>
      <div
        role="status"
        className="mb-3 rounded-lg border border-flag-warn-edge bg-flag-warn px-4 py-2 text-sm text-gold-dark"
      >
        {/* {" "} forces a real space here — JSX trims the leading space off a
            text child that itself wraps to a new line, silently joining
            "ago" and "—" with nothing between them otherwise. */}
        Showing saved data from {relativeTime(cached.savedAt)}{" "}
        — this section isn&apos;t updating right now.
      </div>
      {render(cached.rows, role, extra ?? {})}
    </div>
  );
}
