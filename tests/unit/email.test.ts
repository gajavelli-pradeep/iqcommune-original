import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildLink } from "@/lib/email/links";
import { replyToFor, sendEmail, senderFor, senderNameFor } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import { verifyToken } from "@/lib/tokens";

/** The link contract from ADR 0004, and the guard that stops accidental sends. */

const ID = "a4a7e0eb-dc63-4ca3-b779-2bd1a57f318e";

const APPLICATION_SUMMARY: templates.ApplicationSummary = {
  firstName: "Ananya",
  lastName: "Rao",
  jobTitle: "Equity Analyst",
  experience: "5 – 8 years",
  city: "Mumbai",
  state: "Maharashtra",
  modules: ["Equity Investing Simplified", "Foundations of Personal Finance"],
  email: "ananya@example.com",
  phone: "+91 98765 43210",
};

const SESSION_SUMMARY: templates.SessionRequestSummary = {
  firstName: "Rahul",
  lastName: "Mehta",
  audience: "Group (register as SPOC)",
  topic: "Equity Investing Simplified",
  groupSize: "20",
  city: "Pune",
  state: "Maharashtra",
  preferredWindow: "Weekday mornings",
  email: "rahul@example.com",
  phone: "+91 98765 43211",
};

/**
 * The log and the duplicate check, stubbed out. These tests are about what the
 * sender decides, not what it writes down; persistence is covered in
 * email-outcomes.test.ts.
 *
 * Every `sendEmail` call here must pass this. Without it `defaultDeps()` loads
 * `services/email-log`, which builds a real Supabase client — and the routing
 * tests below then hang until vitest's 5s timeout instead of asserting on a
 * payload. That was invisible for as long as the environment was *broken*:
 * with the required vars unset, `validateEnv()` threw first and the duplicate
 * check was skipped, so the suite passed for the wrong reason. Supply valid env
 * vars, as CI does, and the same tests fail. A unit test must not depend on a
 * database being unreachable.
 */
const noPersistence = {
  alreadySent: async () => false,
  record: async () => {},
  sleep: async () => {},
};

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

  it("gives the application-received link a styled button, not just a bare URL", () => {
    const message = templates.applicationReceived("a@b.com", "Vikram", ID);

    expect(message.html).toContain("https://iqcommune.example/status?t=");
    expect(message.html).not.toContain(ID);
    expect(message.html).toContain("Track your application →");
    // components/ui/Button.tsx's `gold` variant: gold fill, ink label — never
    // white-on-gold (CLAUDE.md contrast rule).
    expect(message.html).toContain("background:#c9982a");
    expect(message.html).toContain("color:#0f1117");
  });

  it("escapes a first name before it reaches the HTML body", () => {
    // A form field, not a trusted string — the plain-text version needs no
    // escaping, but the HTML one renders it as markup if it isn't.
    const message = templates.applicationReceived("a@b.com", "<script>alert(1)</script>", ID);

    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});

describe("email delivery", () => {
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
    templates.newApplicationForAdmin("a@b.com", APPLICATION_SUMMARY),
    templates.practitionerWelcome("a@b.com", "Vikram"),
    templates.applicationRejected("a@b.com", "Vikram"),
    templates.practitionerDeactivated("a@b.com", "Vikram"),
  ];

  const sessionMail = () => [
    templates.sessionRequestReceived("a@b.com", "Asha", "Equity Investing Simplified"),
    templates.sessionRequestFollowUp("a@b.com", "Asha", ["The venue."]),
    templates.sessionRequestCancelled("a@b.com", "Asha"),
    templates.newSessionRequestForAdmin("a@b.com", SESSION_SUMMARY),
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

    await sendEmail("trace", templates.practitionerWelcome("a@b.com", "Vikram"), noPersistence);

    expect(sent?.sender?.email).toBe("practitioner@iqcommune.com");
  });

  /**
   * The return trip. `senderFor` falling back to the shared inbox used to take
   * replies with it, because nothing set Reply-To — so an answer to an
   * automated session email landed in the human enquiries box. Brevo verifies
   * the sender and never Reply-To, so this half of the routing is correct from
   * the first deploy, months before the mailboxes can send.
   */
  it("routes replies to the stream's mailbox even while sending from the shared one", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    // Unverified, so unset: the From must still fall back.
    vi.stubEnv("BREVO_SENDER_SESSION", "");

    let sent: { sender?: { email?: string }; replyTo?: { email?: string } } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ messageId: "1" }));
    });

    await sendEmail(
      "trace",
      templates.sessionRequestReceived("a@b.com", "Asha", "Equity Investing Simplified"),
      noPersistence,
    );

    expect(sent?.sender?.email).toBe("hello@iqcommune.com");
    expect(sent?.replyTo?.email).toBe("session@iqcommune.com");
  });

  it("gives each stream its own display name", () => {
    // Client, 2026-08-10. Constants, not env-gated: these are the names asked
    // for, and they apply from this deploy rather than waiting on a variable.
    expect(senderNameFor("session")).toBe("Session Commune");
    expect(senderNameFor("practitioner")).toBe("Practitioner Commune");
  });

  it("leaves the platform name on the shared variable", () => {
    // Console invites are neither stream and must not start calling themselves
    // Session Commune.
    vi.stubEnv("BREVO_SENDER_NAME", "IQCommune");
    expect(senderNameFor("platform")).toBe("IQCommune");
    expect(senderNameFor()).toBe("IQCommune");

    vi.stubEnv("BREVO_SENDER_NAME", "");
    expect(senderNameFor("platform")).toBe("iqcommune");
  });

  it("does not let the shared name leak into a stream's name", () => {
    // The whole reason these fall back to constants: BREVO_SENDER_NAME is set
    // to "IQCommune" in production, and inheriting it would put IQCommune on
    // the envelope while the body signed Session Commune.
    vi.stubEnv("BREVO_SENDER_NAME", "IQCommune");
    expect(senderNameFor("session")).toBe("Session Commune");
    expect(senderNameFor("practitioner")).toBe("Practitioner Commune");
  });

  it("lets each name be changed without a deploy", () => {
    vi.stubEnv("BREVO_SENDER_NAME_SESSION", "Session Commune India");
    expect(senderNameFor("session")).toBe("Session Commune India");
    expect(senderNameFor("practitioner")).toBe("Practitioner Commune");
  });

  it("signs every body the same way, whatever name the envelope carries", async () => {
    // Client, 2026-08-13: one signature on every email. The envelope still
    // names the stream so a reply reaches the right mailbox, so From and
    // sign-off now differ deliberately — this proves both halves at once, and
    // supersedes the 2026-08-10 rule that they must match.
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");

    let sent: { sender?: { name?: string }; textContent?: string } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ messageId: "1" }));
    });

    await sendEmail("trace", templates.sessionRequestCancelled("a@b.com", "Asha"), noPersistence);
    expect(sent?.sender?.name).toBe("Session Commune");
    expect(sent?.textContent).toContain("- Team iqcommune");

    await sendEmail("trace", templates.practitionerWelcome("a@b.com", "Vikram"), noPersistence);
    expect(sent?.sender?.name).toBe("Practitioner Commune");
    expect(sent?.textContent).toContain("- Team iqcommune");
  });

  it("leaves no per-stream sign-off behind", () => {
    // The 2026-08-13 ask was consistency, so the guard is the absence of the
    // old names: a template quietly reintroducing one is the regression.
    const bodies = [
      templates.sessionRequestCancelled("a@b.com", "Asha").body,
      templates.practitionerWelcome("a@b.com", "Vikram").body,
      templates.onboardingLink("a@b.com", "Vikram", ID).body,
      templates.applicationReceived("a@b.com", "Vikram", ID).body,
    ];

    for (const body of bodies) {
      expect(body).toContain("Team iqcommune");
      expect(body).not.toContain("Session Commune");
      expect(body).not.toContain("Practitioner Commune");
    }
  });

  it("keeps the organisation's name out of the signature", () => {
    // "iqcommune" elsewhere in the copy names the company, not the sender, and
    // is left alone — the signature is the only line that changed.
    const welcome = templates.onboardingLink("a@b.com", "Vikram", ID);
    expect(welcome.subject).toContain("iqcommune");
    expect(templates.applicationReceived("a@b.com", "Vikram", ID).body).toContain(
      "iqcommune practitioner network",
    );
  });

  it("omits Reply-To once the stream sends from its own mailbox", () => {
    // Equal to the From, so it would route nothing and only add a header.
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_SESSION", "session@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_PRACTITIONER", "");

    expect(replyToFor("session")).toBeUndefined();
    expect(replyToFor("practitioner")).toBe("practitioner@iqcommune.com");
    // Platform mail already leaves from the inbox replies should reach.
    expect(replyToFor("platform")).toBeUndefined();
    expect(replyToFor()).toBeUndefined();
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
    // Sign-off updated by the client on 2026-08-13 — one signature everywhere,
    // superseding the per-stream "The Practitioner Commune Team" of 2026-08-10.
    // The prose above it is untouched: that names the organisation, not the sender.
    expect(message.body).toContain("Regards,\nTeam iqcommune");

    // The HTML version carries the same client-approved wording — only the
    // link's presentation (a button, not a bare URL) differs.
    expect(message.html).toContain(
      "Thanks for applying to join the iqcommune practitioner network — we've received your application.",
    );
    expect(message.html).toContain("Regards,<br>Team iqcommune");
  });

  it("admin notification for a new application names the applicant, modules and a console link", () => {
    const message = templates.newApplicationForAdmin("admin@iqcommune.com", APPLICATION_SUMMARY);

    expect(message.subject).toBe("New practitioner application: Ananya Rao");
    expect(message.body).toContain("Modules: Equity Investing Simplified, Foundations of Personal Finance");
    expect(message.body).toContain("https://iqcommune.example/console?tab=practitioners");

    expect(message.html).toContain("Ananya Rao");
    expect(message.html).toContain("Equity Investing Simplified, Foundations of Personal Finance");
    expect(message.html).toContain("Review in console →");
    expect(message.html).toContain("https://iqcommune.example/console?tab=practitioners");
  });

  it("admin notification for a new session request names the requester, topic and a console link", () => {
    const message = templates.newSessionRequestForAdmin("admin@iqcommune.com", SESSION_SUMMARY);

    expect(message.subject).toBe("New session request: Equity Investing Simplified");
    expect(message.body).toContain("Requester: Rahul Mehta");
    expect(message.body).toContain("https://iqcommune.example/console?tab=requests");

    expect(message.html).toContain("Rahul Mehta");
    expect(message.html).toContain("Group (register as SPOC)");
    expect(message.html).toContain("Review in console →");
  });

  it("omits the optional organisation/group-size/preferred-dates rows when the request has none", () => {
    const message = templates.newSessionRequestForAdmin("admin@iqcommune.com", {
      ...SESSION_SUMMARY,
      organisationName: undefined,
      groupSize: undefined,
      preferredWindow: undefined,
    });

    expect(message.body).not.toContain("Organisation:");
    expect(message.body).not.toContain("Group size:");
    expect(message.body).not.toContain("Preferred dates:");
    expect(message.html).not.toContain("Organisation");
    expect(message.html).not.toContain("Group size");
  });

  it("escapes admin-notification fields — they're user input, not trusted strings", () => {
    const message = templates.newApplicationForAdmin("admin@iqcommune.com", {
      ...APPLICATION_SUMMARY,
      jobTitle: "<img src=x onerror=alert(1)>",
    });

    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("&lt;img");
  });

  it("session-request acknowledgment, including the topic", () => {
    const message = templates.sessionRequestReceived("a@b.com", "Rahul", "Equity Investing Simplified");

    expect(message.subject).toBe(
      "Thank you for reposing faith in us - We have recorded your interest",
    );
    expect(message.body).toContain(
      "we have received your request for a session on Equity Investing Simplified.",
    );
    // Client copy, 2026-08-12, generalised to every template on 2026-08-13.
    // Once the lone exception, now the house signature — still asserted here
    // because this is the template whose approved wording set it.
    expect(message.body).toContain("Regards,\nTeam iqcommune");
    expect(message.body).not.toContain("The Session Commune Team");
  });

  it("promises no reply window in the acknowledgment", () => {
    // Sessions are not scheduled on arrival during the opening months, so the
    // acknowledgment commits to the practitioner mapping and not to a date.
    // A "2-3 working days" line reappearing here is the regression.
    const message = templates.sessionRequestReceived("a@b.com", "Rahul", "Equity Investing Simplified");

    expect(message.body).not.toMatch(/working days/i);
    expect(message.body).toContain("as soon as we are able to map the right practitioner");
  });
});
