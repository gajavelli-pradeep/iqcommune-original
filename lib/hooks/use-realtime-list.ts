"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type Change = RealtimePostgresChangesPayload<Record<string, unknown>>;

// ── Low-level primitive ──────────────────────────────────────────────────────
// Subscribe to a table's changes and call `onChange` for every INSERT/UPDATE/
// DELETE. The socket carries the signed-in user's JWT (required so RLS lets the
// events through); for public/anon pages there's no session and the anon key is
// used — pair that with a public RLS policy. Use this directly when you need to
// patch cross-table state or refetch derived data; use useRealtimeList for a
// plain list. getSession() is async (session lives in cookies) so we set auth
// before subscribing.
// Monotonic per-instance id so two components subscribing to the SAME table each
// get a distinct channel topic. Supabase rejects a second `.on()` after a shared
// topic has `subscribe()`d, which would throw when e.g. the inline Settings invite
// block and the credentials modal both watch `admin_invites` at once.
let channelSeq = 0;

export function useRealtimeChannel(table: string, onChange: (payload: Change) => void) {
  const handlerRef = useRef(onChange);
  useEffect(() => {
    handlerRef.current = onChange;
  });

  // Lazy state initializer runs once per mount — a stable, unique topic id without
  // touching a ref during render (react-hooks/refs).
  const [channelId] = useState(() => ++channelSeq);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`realtime:${table}:${channelId}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => handlerRef.current(payload))
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [table, channelId]);
}

// ── List hook ────────────────────────────────────────────────────────────────
// Drop-in replacement for useState(initial) that also live-merges Realtime
// events into the list. Any admin table becomes live in ~2 lines.
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
  payload: Change,
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

  const transformRef = useRef(transform);
  const keepRef = useRef(keep);
  useEffect(() => {
    transformRef.current = transform;
    keepRef.current = keep;
  });

  useRealtimeChannel(table, (payload) =>
    setData((prev) => applyChange(prev, payload, transformRef.current, keepRef.current))
  );

  return [data, setData];
}
