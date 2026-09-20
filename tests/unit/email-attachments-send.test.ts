import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_ATTACHMENT_BYTES, sendEmail, type SendDeps } from "@/lib/email/send";

const MESSAGE = {
  to: "asha@example.com",
  subject: "s",
  body: "b",
  template: "practitioner-welcome",
  stream: "practitioner" as const,
};

function harness(fetchImpl: SendDeps["fetch"]) {
  const recorded: Parameters<SendDeps["record"]>[0][] = [];
  const deps: Partial<SendDeps> = {
    fetch: fetchImpl,
    sleep: async () => {},
    alreadySent: async () => false,
    record: async (a) => {
      recorded.push(a);
    },
  };
  return { deps, recorded };
}

beforeEach(() => {
  vi.stubEnv("EMAIL_DELIVERY", "live");
  vi.stubEnv("BREVO_API_KEY", "key");
  vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("email attachments", () => {
  it("sends them to Brevo as `attachment` with base64 content", async () => {
    const fetchSpy = vi.fn(async () => new Response('{"messageId":"m1"}', { status: 201 }));
    const { deps } = harness(fetchSpy as unknown as SendDeps["fetch"]);

    await sendEmail("t", { ...MESSAGE, attachments: [{ name: "a.pdf", content: "QUJD" }] }, deps);

    const sent = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.attachment).toEqual([{ name: "a.pdf", content: "QUJD" }]);
  });

  it("omits the field when there are none", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 201 }));
    const { deps } = harness(fetchSpy as unknown as SendDeps["fetch"]);

    await sendEmail("t", MESSAGE, deps);

    const sent = JSON.parse((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent).not.toHaveProperty("attachment");
  });

  it("refuses an oversize set with a named failure and never calls Brevo", async () => {
    const fetchSpy = vi.fn();
    const { deps, recorded } = harness(fetchSpy as unknown as SendDeps["fetch"]);

    const outcome = await sendEmail(
      "t",
      { ...MESSAGE, attachments: [{ name: "big.pdf", content: "A".repeat(MAX_ATTACHMENT_BYTES + 1) }] },
      deps,
    );

    expect(outcome.ok).toBe(false);
    expect(outcome.errorCode).toBe("ATTACHMENTS_TOO_LARGE");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(1);
  });
});
