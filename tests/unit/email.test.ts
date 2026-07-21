import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildLink } from "@/lib/email/links";
import { sendEmail } from "@/lib/email/send";
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
    ];
    for (const message of cases) {
      expect(message.body).toContain("https://iqcommune.example/");
      expect(message.body).not.toContain(ID);
    }
  });
});

describe("email delivery", () => {
  it("sends nothing unless delivery is explicitly live", async () => {
    // A dev database full of test rows would otherwise mail real people.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("EMAIL_DELIVERY", "");

    const outcome = await sendEmail("trace", { to: "a@b.com", subject: "s", body: "b" });

    expect(outcome).toEqual({ delivered: false, reason: "dry-run" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing provider key rather than pretending to send", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("BREVO_SENDER_EMAIL", "");

    expect(await sendEmail("trace", { to: "a@b.com", subject: "s", body: "b" })).toEqual({
      delivered: false,
      reason: "not-configured",
    });
  });
});
