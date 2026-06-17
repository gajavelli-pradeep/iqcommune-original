interface EmailParams {
  to: string;
  name?: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({
  to,
  name,
  subject,
  htmlContent,
}: EmailParams): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME ?? "iqcommune",
        email: process.env.BREVO_SENDER_EMAIL!,
      },
      to: [{ email: to, name: name ?? to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo send failed: ${res.status} ${text}`);
  }
}
