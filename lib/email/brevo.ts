interface EmailParams {
  to: string;
  name?: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  // Validate at send time, not module load — a top-level throw crashes
  // `next build` page-data collection (build env has no BREVO_API_KEY).
  if (!process.env.BREVO_API_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("BREVO_API_KEY environment variable is not set");
  }
  await attempt(params, 2);
}

async function attempt(params: EmailParams, retriesLeft: number): Promise<void> {
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
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
