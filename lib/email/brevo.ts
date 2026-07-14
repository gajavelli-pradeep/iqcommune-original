interface EmailParams {
  to: string;
  name?: string;
  subject: string;
  htmlContent: string;
}

// Resolves with Brevo's `messageId` for the accepted message (used to map delivery
// webhook events back to the record). Null if Brevo's 2xx body omits it.
export async function sendEmail(params: EmailParams): Promise<{ messageId: string | null }> {
  // Validate at send time, not module load — a top-level throw crashes
  // `next build` page-data collection (build env has no BREVO_API_KEY).
  if (process.env.NODE_ENV !== "test") {
    if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY environment variable is not set");
    if (!process.env.BREVO_SENDER_EMAIL) throw new Error("BREVO_SENDER_EMAIL environment variable is not set");
  }
  return attempt(params, 2);
}

async function attempt(params: EmailParams, retriesLeft: number): Promise<{ messageId: string | null }> {
  const { to, name, subject, htmlContent } = params;

  let res: Response;
  try {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name:  process.env.BREVO_SENDER_NAME ?? "iqcommune",
          email: process.env.BREVO_SENDER_EMAIL!,
        },
        to: [{ email: to, name: name ?? to }],
        subject,
        htmlContent,
      }),
    });
  } catch (err) {
    // Network error or 8 s timeout — retry once after 300 ms
    if (retriesLeft > 0) {
      await delay(300);
      return attempt(params, retriesLeft - 1);
    }
    throw err;
  }

  if (!res.ok) {
    const text = (await res.text()).slice(0, 500);
    // 5xx is transient — retry once
    if (res.status >= 500 && retriesLeft > 0) {
      await delay(300);
      return attempt(params, retriesLeft - 1);
    }
    throw new Error(`Brevo send failed: ${res.status} ${text}`);
  }

  const body = (await res.json().catch(() => null)) as { messageId?: string } | null;
  // Brevo returns the id wrapped in angle brackets on send (<id@relay>) but the
  // delivery webhook sends it bare — strip brackets so the two always match.
  const raw = typeof body?.messageId === "string" ? body.messageId : null;
  return { messageId: raw ? raw.replace(/^<|>$/g, "") : null };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
