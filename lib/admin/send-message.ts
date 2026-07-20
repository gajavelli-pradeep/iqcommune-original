// Client helper for the V6 §3 generic message send (editable informational sends).
// Never throws — returns a discriminated result so callers can toast either way.
export async function sendMessageRequest(payload: {
  to: string;
  name?: string;
  subject: string;
  body: string;
  kind?: string;
}): Promise<{ ok: boolean; sentTo?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await res.json().catch(() => ({}))) as { sentTo?: string; error?: string };
    if (!res.ok) return { ok: false, error: j.error ?? "Couldn't send the message." };
    return { ok: true, sentTo: j.sentTo };
  } catch {
    return { ok: false, error: "Network error — please try again." };
  }
}
