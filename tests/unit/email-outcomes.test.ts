import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isSendableAddress, OUTCOMES, type EmailStatus } from "@/lib/email/outcome";
import { sendEmail, type SendDeps } from "@/lib/email/send";

/**
 * The failure taxonomy.
 *
 * Every one of these was previously `reason: "failed"`, which is the same
 * sentence for a mistyped address, an expired API key, Brevo throttling us and
 * a dropped socket — four problems with four different owners and four
 * different fixes. What is asserted here is that each ends somewhere distinct,
 * says something a person can act on, is retried only if retrying could help,
 * and leaves a row behind either way.
 */

const MESSAGE = {
  to: "asha@example.com",
  subject: "s",
  body: "b",
  template: "session-request-received",
  stream: "session" as const,
};

const reply = (status: number, body = "{}") =>
  new Response(body, { status, headers: { "Content-Type": "application/json" } });

function deps(fetchImpl: SendDeps["fetch"], over: Partial<SendDeps> = {}) {
  const recorded: Parameters<SendDeps["record"]>[0][] = [];
  const value: Partial<SendDeps> = {
    fetch: fetchImpl,
    // No real waiting: the backoff is a decision, not a duration to sit through.
    sleep: async () => {},
    alreadySent: async () => false,
    record: async (attempt) => {
      recorded.push(attempt);
    },
    ...over,
  };
  return { deps: value, recorded };
}

beforeEach(() => {
  vi.stubEnv("EMAIL_DELIVERY", "live");
  vi.stubEnv("BREVO_API_KEY", "key");
  vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * The distinction that caused a real incident: two admin invites were reported
 * to the console as "Invite sent" while EMAIL_DELIVERY was unset and no mail
 * was ever dispatched. The caller keyed on `ok`, and a dry run is `ok` — it is
 * the system doing exactly what it was configured to do. Only `delivered` may
 * be read as "this reached someone".
 */
describe("ok is not delivered", () => {
  const DELIVERED: EmailStatus[] = ["sent", "queued", "duplicate"];

  it.each(Object.keys(OUTCOMES) as EmailStatus[])(
    "%s claims delivery only if it really sent something",
    (status) => {
      expect(OUTCOMES[status].delivered).toBe(DELIVERED.includes(status));
    },
  );

  it("a dry run is fine and is not delivery", () => {
    expect(OUTCOMES["dry-run"]).toMatchObject({ ok: true, delivered: false });
    expect(OUTCOMES["dry-run"].message).toContain("not sent");
  });

  it("nothing that failed claims delivery", () => {
    for (const [status, shape] of Object.entries(OUTCOMES)) {
      if (!shape.ok) expect(shape.delivered, `${status} must not claim delivery`).toBe(false);
    }
  });
});

describe("recipient validation", () => {
  it.each([
    ["asha@example.com", true],
    ["a.b+c@sub.example.co.in", true],
    ["", false],
    ["no-at-sign", false],
    ["two@@example.com", false],
    ["missing@tld", false],
    ["spaced address@example.com", false],
    // The one that is not a typo: a newline turns a recipient into headers.
    ["asha@example.com\nBcc: everyone@example.com", false],
  ])("%s → sendable: %s", (address, expected) => {
    expect(isSendableAddress(address)).toBe(expected);
  });

  it("never reaches the provider with an unsendable address", async () => {
    const fetchMock = vi.fn();
    const { deps: d, recorded } = deps(fetchMock as unknown as SendDeps["fetch"]);

    const outcome = await sendEmail("t", { ...MESSAGE, to: "bad address" }, d);

    expect(outcome.status).toBe("invalid-recipient");
    expect(outcome.message).toBe("Invalid recipient email.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recorded).toHaveLength(1);
  });
});

describe("provider responses", () => {
  it.each([
    [201, "sent", "Email sent successfully."],
    [202, "queued", "Email queued successfully."],
    [401, "auth-failed", "Authentication failed."],
    [403, "auth-failed", "Authentication failed."],
    [400, "rejected", "The provider rejected this message."],
  ])("%i → %s", async (status, expected, message) => {
    const { deps: d } = deps(async () => reply(status));
    const outcome = await sendEmail("t", MESSAGE, d);
    expect(outcome.status).toBe(expected);
    expect(outcome.message).toBe(message);
  });

  it("keeps the provider's own explanation for the log, not for the user", async () => {
    const { deps: d, recorded } = deps(async () =>
      reply(400, JSON.stringify({ message: "sender not verified" })),
    );

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.errorMessage).toContain("sender not verified");
    expect(outcome.message).not.toContain("sender not verified");
    expect(recorded[0].result.errorCode).toBe("400");
  });
});

describe("retrying", () => {
  it("retries a rate limit and reports success once it clears", async () => {
    let calls = 0;
    const { deps: d } = deps(async () => {
      calls += 1;
      return calls === 1 ? reply(429) : reply(201);
    });

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.status).toBe("sent");
    expect(outcome.retryCount).toBe(1);
    expect(calls).toBe(2);
  });

  it("gives up after the bounded number of attempts, keeping the last reason", async () => {
    let calls = 0;
    const { deps: d } = deps(async () => {
      calls += 1;
      return reply(503);
    });

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.status).toBe("server-error");
    expect(outcome.message).toBe("Temporary server error.");
    // One attempt, two retries — a request must not wait through more.
    expect(calls).toBe(3);
    expect(outcome.retryCount).toBe(2);
  });

  it("does not retry a permanent failure — the second call fails identically", async () => {
    let calls = 0;
    const { deps: d } = deps(async () => {
      calls += 1;
      return reply(401);
    });

    await sendEmail("t", MESSAGE, d);

    expect(calls).toBe(1);
  });

  it("treats a dropped connection as transient", async () => {
    let calls = 0;
    const { deps: d } = deps(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return reply(201);
    });

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.status).toBe("sent");
    expect(calls).toBe(2);
  });

  it("names a timeout as a timeout rather than an unknown error", async () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    const { deps: d } = deps(async () => {
      throw abort;
    });

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.status).toBe("timeout");
    expect(outcome.retryable).toBe(true);
  });
});

describe("duplicates", () => {
  it("does not send the same template to the same address twice", async () => {
    const fetchMock = vi.fn(async () => reply(201));
    const { deps: d, recorded } = deps(fetchMock as unknown as SendDeps["fetch"], {
      alreadySent: async () => true,
    });

    const outcome = await sendEmail("t", MESSAGE, d);

    expect(outcome.status).toBe("duplicate");
    expect(outcome.message).toBe("Email already sent.");
    expect(outcome.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    // Still logged: "we deliberately did not send this" is an outcome someone
    // will need to see when they ask why no second email arrived.
    expect(recorded).toHaveLength(1);
  });
});

describe("the log", () => {
  it("records every attempt, including the ones that never reach the provider", async () => {
    const cases: { over: Partial<SendDeps>; env?: [string, string]; expect: string }[] = [
      { over: {}, env: ["EMAIL_DELIVERY", "off"], expect: "dry-run" },
      { over: {}, env: ["BREVO_API_KEY", ""], expect: "not-configured" },
      { over: { alreadySent: async () => true }, expect: "duplicate" },
    ];

    for (const c of cases) {
      vi.stubEnv("EMAIL_DELIVERY", "live");
      vi.stubEnv("BREVO_API_KEY", "key");
      if (c.env) vi.stubEnv(c.env[0], c.env[1]);

      const { deps: d, recorded } = deps(async () => reply(201), c.over);
      await sendEmail("trace-1", MESSAGE, d);

      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({
        traceId: "trace-1",
        template: "session-request-received",
        recipient: "asha@example.com",
        stream: "session",
      });
      expect(recorded[0].result.status).toBe(c.expect);
    }
  });

  it("carries the provider's message id when there is one", async () => {
    const { deps: d, recorded } = deps(async () =>
      reply(201, JSON.stringify({ messageId: "<abc@brevo>" })),
    );

    await sendEmail("t", MESSAGE, d);

    expect(recorded[0].result.providerMessageId).toBe("<abc@brevo>");
  });
});
