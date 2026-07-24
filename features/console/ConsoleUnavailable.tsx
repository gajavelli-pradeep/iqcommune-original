"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Shown in place of the console when `requireRole`/`getConsoleSession` throws
 * `BackendUnavailableError` — the auth check couldn't reach Supabase at all,
 * as opposed to a legitimate "no session" (which still redirects to /login).
 *
 * Deliberately NOT `ErrorNotice`: that component is the app's one generic
 * failure surface, and rendering it here is the exact collapse this exists to
 * avoid — an operator mid-outage seeing the same "Something went wrong" a
 * random crash would show, with no signal that this is a known, self-healing
 * condition rather than something they broke. This screen carries the
 * console's own identity (the `iq`/`commune` wordmark from `ConsoleShell`)
 * and retries on its own, because the fix is "wait for Supabase," not
 * anything the user can do.
 */
export function ConsoleUnavailable({
  message = "We're having a temporary issue reaching our servers — this is on us, not you. Your session is safe, and this usually resolves on its own.",
}: {
  message?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    // Auth is re-checked on every server render, so once Supabase recovers the
    // very next refresh returns the real console — no full reload needed.
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-5 py-16">
      <div className="w-full max-w-narrow rounded-lg bg-surface p-8 text-center shadow-card-soft">
        <span className="flex items-baseline justify-center leading-none">
          <span className="text-4xl font-bold tracking-display text-gold">iq</span>
          <span className="text-4xl font-light tracking-display text-ink">commune</span>
        </span>
        <span className="mt-1 block text-2xs font-semibold uppercase leading-none tracking-caps text-gold-dark">
          Console
        </span>

        <h1 className="mt-6 text-3xl font-semibold tracking-display text-ink">Reconnecting…</h1>
        <p className="mt-3 text-md leading-relaxed text-ink-muted">{message}</p>

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="w-full rounded-md bg-ink px-6 py-3 text-md font-medium text-surface sm:w-auto"
          >
            Try again
          </button>
        </div>

        <p className="mt-6 text-2xs text-ink-faint">
          This page checks again automatically every 20 seconds.
        </p>
      </div>
    </div>
  );
}
