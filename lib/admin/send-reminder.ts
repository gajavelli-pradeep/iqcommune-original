import { fetchJson, HttpError } from "@/lib/http";

export type ReminderResult = { ok: true; sentTo: string } | { ok: false; error: string };

/**
 * POST a reminder-send endpoint and normalise the outcome.
 *
 * Always resolves (never throws): the UI decides what to do with `error`, and the
 * manual copy/mailto path stays available as the fallback on any failure.
 */
export async function sendReminderRequest(url: string): Promise<ReminderResult> {
  try {
    const { sentTo } = await fetchJson<{ sentTo: string }>(url, { method: "POST" });
    return { ok: true, sentTo };
  } catch (e) {
    // fetchJson throws HttpError carrying the server's {error} (e.g. the 409
    // "no email on file" or the 502 "copy and send manually") or a status message.
    return { ok: false, error: e instanceof HttpError ? e.message : "Something went wrong. Please try again." };
  }
}
