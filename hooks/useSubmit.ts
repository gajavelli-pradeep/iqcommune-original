"use client";

import { useState } from "react";

/**
 * The generalised submit path (audit M5) — supersedes `useApiSubmit`.
 *
 * `useApiSubmit` owned the JSON token path; the post-session photo upload
 * hand-rolled the same busy / error / envelope sequence for a `FormData`
 * multipart body. This owns both: pass a plain object and it POSTs JSON; pass a
 * `FormData` and it POSTs multipart, letting the browser set the boundary (never
 * set `Content-Type` on a FormData body — a manual value drops the boundary and
 * the upload arrives unparseable).
 *
 * `token` is optional — the tokenised forms pass one (merged into the body as
 * `t`); the photo path has none. On success it returns the response's `data`
 * envelope (the tokenised forms read its `{ at }` timestamp); on failure it
 * surfaces `error.message` and returns null.
 */
export function useSubmit(token?: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit<T = { at: string }>(
    endpoint: string,
    payload?: Record<string, unknown> | FormData,
  ): Promise<T | null> {
    setBusy(true);
    setError(undefined);
    try {
      let init: RequestInit;
      if (payload instanceof FormData) {
        if (token) payload.set("t", token);
        init = { method: "POST", body: payload };
      } else {
        init = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(token ? { t: token } : {}), ...(payload ?? {}) }),
        };
      }

      const response = await fetch(endpoint, init);
      const body = (await response.json()) as { data?: T; error?: { message?: string } };
      if (!response.ok) {
        setError(body?.error?.message ?? "Something went wrong. Please try again.");
        return null;
      }
      return (body.data ?? null) as T | null;
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error };
}
