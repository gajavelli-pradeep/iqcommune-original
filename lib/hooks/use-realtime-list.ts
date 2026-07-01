"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Generic live-list hook: a drop-in replacement for useState(initial) that also
// subscribes to Supabase Realtime and merges INSERT/UPDATE/DELETE into the list
// in place — no refetch, no page refresh. Any admin table becomes live in ~2 lines.
//
// Requirements per table: Realtime enabled (in the supabase_realtime publication)
// + an RLS SELECT policy the signed-in admin satisfies (see migration 0022).

type Row = { id: string };

interface Options<T extends Row> {
  /** Public-schema table name to subscribe to. */
  table: string;
  /** Server-provided initial rows (already shaped for the UI). */
  initial: T[];
  /** Shape a raw DB row (realtime payload) into T. Applied on INSERT only, where a
   *  full row is needed; UPDATE merges only the raw columns so joined/derived fields
   *  already on the row (e.g. a joined name) are preserved. Default: identity. */
  transform?: (raw: Record<string, unknown>) => T;
  /** Return false to drop a row (e.g. soft-deleted). A row that stops qualifying on
   *  UPDATE is removed from the list. Default: keep all. */
  keep?: (row: T) => boolean;
}

function applyChange<T extends Row>(
  prev: T[],
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  transform?: (raw: Record<string, unknown>) => T,
  keep?: (row: T) => boolean
): T[] {
  const shape = (raw: Record<string, unknown>): T => (transform ? transform(raw) : (raw as unknown as T));

  if (payload.eventType === "INSERT") {
    const row = shape(payload.new);
    if (keep && !keep(row)) return prev;
    if (prev.some((x) => x.id === row.id)) return prev; // optimistic update already added it
    return [row, ...prev];
  }

  if (payload.eventType === "UPDATE") {
    const raw = payload.new as Partial<T> & { id: string };
    const existing = prev.find((x) => x.id === raw.id);
    // Merge only the changed columns so joins/derived fields on `existing` survive.
    const merged = existing ? { ...existing, ...raw } : shape(payload.new);
    if (keep && !keep(merged)) return prev.filter((x) => x.id !== raw.id); // e.g. soft-deleted
    if (!existing) return [merged, ...prev]; // re-entered the list (e.g. restored)
    return prev.map((x) => (x.id === raw.id ? merged : x));
  }

  if (payload.eventType === "DELETE") {
    const id = (payload.old as { id?: string })?.id;
    return id ? prev.filter((x) => x.id !== id) : prev;
  }

  return prev;
}

export function useRealtimeList<T extends Row>(
  { table, initial, transform, keep }: Options<T>
): [T[], Dispatch<SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initial);

  // Latest transform/keep without forcing a re-subscribe (they close over live state).
  const transformRef = useRef(transform);
  const keepRef = useRef(keep);
  useEffect(() => {
    transformRef.current = transform;
    keepRef.current = keep;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    // The Realtime socket must carry the signed-in user's JWT, otherwise it
    // authenticates as `anon` and RLS rejects every change. getSession() is
    // async (session lives in cookies), so set auth before subscribing.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => setData((prev) => applyChange(prev, payload, transformRef.current, keepRef.current))
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [table]);

  return [data, setData];
}
