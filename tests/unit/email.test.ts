import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildLink } from "@/lib/email/links";
import { sendEmail, senderFor } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import { verifyToken } from "@/lib/tokens";

/** The link contract from ADR 0004, and the guard that stops accidental sends. */

const ID = "a4a7e0eb-dc63-4ca3-b779-2bd1a57f318e";

beforeEach(() => {
  vi.stubEnv("HMAC_SECRET", "test-secret-at-least-32-characters-long");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://iqcommune.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("emailed links", () => {
  it("builds a link whose token verifies for that page and no other", () => {
    const link = buildLink("rate", ID);
    const token = new URL(link).searchParams.get("t");

    expect(link.startsWith("https://iqcommune.example/rate?t=")).toBe(true);
    const verified = verifyToken("rate", token!);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.payload.id).toBe(ID);

    // The same link must be useless against another flow.
    expect(verifyToken("consent", token!)).toEqual({ ok: false, reason: "wrong-kind" });
  });

  it("never puts the raw id in the URL", () => {
    // The whole point of the token: a readable id in a link is an invitation to
    // change it and see whose session comes back.
    expect(buildLink("consent", ID)).not.toContain(ID);
  });

  it("refuses to build a link with no absolute host", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    expect(() => buildLink("photos", ID)).toThrow(/NEXT_PUBLIC_BASE_URL/);
  });

  it("puts a working link in every template that promises one", () => {
    const cases = [
      templates.ratingRequest("a@b.com", "Vikram", ID),
      templates.consentRequest("a@b.com", "Vikram", ID),
      templates.photoReminder("a@b.com", "Vikram", ID),
      templates.onboardingLink("a@b.com", "Vikram", ID),
      templates.adminInvite("a@b.com", ID),
      templates.applicationReceived("a@b.com", "Vikram", ID),
    ];
    for (const message of cases) {
      expect(message.body).toContain("https://iqcommune.example/");
      expect(message.body).not.toContain(ID);
    }
  });
});

describe("email delivery", () => {
  // The log and the duplicate check are stubbed out: this describe is about
  // what the sender decides, not about what it writes down. The persistence is
  // covered in email-outcomes.test.ts.
  const noPersistence = {
    alreadySent: async () => false,
    record: async () => {},
    sleep: async () => {},
  };

  it("sends nothing unless delivery is explicitly live", async () => {
    // A dev database full of test rows would otherwise mail real people.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("EMAIL_DELIVERY", "");

    const outcome = await sendEmail(
      "trace",
      { to: "a@b.com", subject: "s", body: "b", template: "t" },
      noPersistence,
    );

    expect(outcome.status).toBe("dry-run");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing provider key rather than pretending to send", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("BREVO_SENDER_EMAIL", "");

    const outcome = await sendEmail(
      "trace",
      { to: "a@b.com", subject: "s", body: "b", template: "t" },
      noPersistence,
    );
    expect(outcome.status).toBe("not-configured");
    expect(outcome.message).toBe("Missing configuration.");
  });
});

/**
 * Which mailbox each email leaves from (client decision, 2026-07-23).
 *
 * Pinned by test because the failure is silent and external: a template that
 * drifts to the wrong stream still sends, still looks right in the console, and
 * is only noticed when a practitioner's reply lands in the sessions inbox. The
 * table below is the client's split, restated where a change has to update it.
 */
describe("email sender routing", () => {
  // Built inside each test, not at describe time: templates that carry a link
  // read NEXT_PUBLIC_BASE_URL, which `beforeEach` has not stubbed yet when the
  // describe body runs.
  const practitionerMail = () => [
    templates.onboardingLink("a@b.com", "Vikram", ID),
    templates.applicationReceived("a@b.com", "Vikram", ID),
    templates.practitionerWelcome("a@b.com", "Vikram"),
    templates.applicationRejected("a@b.com", "Vikram"),
    templates.practitionerDeactivated("a@b.com", "Vikram"),
  ];

  const sessionMail = () => [
    templates.sessionRequestReceived("a@b.com", "Asha", "Equity Investing Simplified"),
    templates.sessionRequestFollowUp("a@b.com", "Asha", ["The venue."]),
    templates.sessionRequestCancelled("a@b.com", "Asha"),
    templates.newSessionRequestForAdmin("a@b.com", "summary"),
    templates.consentRequest("a@b.com", "Vikram", ID),
    templates.photoReminder("a@b.com", "Vikram", ID),
    templates.ratingRequest("a@b.com", "Asha", ID),
  ];

  it("sends every practitioner-pipeline email from the practitioner mailbox", () => {
    for (const message of practitionerMail()) expect(message.stream).toBe("practitioner");
  });

  it("sends every session email from the session mailbox", () => {
    for (const message of sessionMail()) expect(message.stream).toBe("session");
  });

  it("leaves the console invite on the platform sender", () => {
    // Team access is neither pipeline nor session work.
    expect(templates.adminInvite("a@b.com", ID).stream).toBeUndefined();
  });

  it("resolves each stream to its own address once configured", () => {
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_PRACTITIONER", "practitioner@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_SESSION", "session@iqcommune.com");

    expect(senderFor("practitioner")).toBe("practitioner@iqcommune.com");
    expect(senderFor("session")).toBe("session@iqcommune.com");
    expect(senderFor("platform")).toBe("hello@iqcommune.com");
    expect(senderFor()).toBe("hello@iqcommune.com");
  });

  it("falls back to the shared sender until a mailbox is configured", () => {
    // The mailboxes arrive with Google Workspace and must then be verified with
    // Brevo. Until both are done the variables stay unset, and nothing may
    // break in the meantime.
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_PRACTITIONER", "");
    vi.stubEnv("BREVO_SENDER_SESSION", "");

    expect(senderFor("practitioner")).toBe("hello@iqcommune.com");
    expect(senderFor("session")).toBe("hello@iqcommune.com");
  });

  it("sends from the stream's address, not the shared one", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_PRACTITIONER", "practitioner@iqcommune.com");

    let sent: { sender?: { email?: string } } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ messageId: "1" }));
    });

    await sendEmail("trace", templates.practitionerWelcome("a@b.com", "Vikram"));

    expect(sent?.sender?.email).toBe("practitioner@iqcommune.com");
  });
});

/**
 * The client's acknowledgment spec (client_requirements/.../client_email.txt)
 * asked for both submission flows to send an immediate acknowledgment email —
 * only the session-request one did. Pinned by content, not just by stream:
 * the failure mode here is an email that still sends but says the wrong
 * thing, which nothing else in this file would catch.
 */
describe("submission acknowledgment emails match the client's exact copy", () => {
  it("application acknowledgment", () => {
    const message = templates.applicationReceived("a@b.com", "Ananya", ID);

    expect(message.subject).toBe("iqcommune — we've received your application");
    expect(message.body).toContain(
      "Thanks for applying to join the iqcommune practitioner network — we've received your application.",
    );
    expect(message.body).toContain("Track your application:");
    expect(message.body).toContain("https://iqcommune.example/status?t=");
    expect(message.body).toContain("Regards,\nThe iqcommune Team");
  });

  it("session-request acknowledgment, including the topic", () => {
    const message = templates.sessionRequestReceived("a@b.com", "Rahul", "Equity Investing Simplified");

    expect(message.subject).toBe("iqcommune — your session request has been received");
    expect(message.body).toContain(
      "we've received your request for a session on Equity Investing Simplified.",
    );
    expect(message.body).toContain("Regards,\nThe iqcommune Team");
  });
});
