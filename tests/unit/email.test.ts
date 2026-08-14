import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_SHOTS } from "@/constants/photo-shots";
import { buildLink } from "@/lib/email/links";
import { replyToFor, sendEmail, senderFor, senderNameFor } from "@/lib/email/send";
import * as templates from "@/lib/email/templates";
import { verifyToken } from "@/lib/tokens";

/** The link contract from ADR 0004, and the guard that stops accidental sends. */

const ID = "a4a7e0eb-dc63-4ca3-b779-2bd1a57f318e";

/**
 * The values the bodies quote (console-messages doc, rev 2). References carry
 * their real prefixes — an agreement is IQC-AGR and a practitioner is IQC-EMP,
 * and a test that blurred them would not catch the two being swapped.
 */
const MODULE = "Equity Investing Simplified";
const AGREEMENT_REF = "IQC-AGR-0007";
const PRACTITIONER_REF = "IQC-EMP-0042";
const CONSENT_DETAILS = {
  module: MODULE,
  sessionReference: "IQC-S0007",
  confirmationReference: "IQC-CONF-0012",
};
const RATED_SESSION = { module: MODULE, practitionerName: "Vikram Rao" };
const REQUEST_ECHO: templates.RequestEcho = {
  topic: MODULE,
  audience: "Organisations & Institutions",
  groupSize: "16-25",
  preferredWindow: "Early March",
};

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
      templates.ratingRequest("a@b.com", "Vikram", ID, RATED_SESSION),
      templates.consentRequest("a@b.com", "Vikram", ID, CONSENT_DETAILS),
      templates.photoReminder("a@b.com", "Vikram", ID, MODULE),
      templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF),
      templates.adminInvite("a@b.com", ID, "Admin"),
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
    templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF),
    templates.applicationReceived("a@b.com", "Vikram", ID),
    templates.newApplicationForAdmin("a@b.com", APPLICATION_SUMMARY),
    templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF),
    templates.applicationRejected("a@b.com", "Vikram"),
    templates.practitionerDeactivated("a@b.com", "Vikram"),
  ];

  const sessionMail = () => [
    templates.sessionRequestReceived("a@b.com", "Asha", "Equity Investing Simplified"),
    templates.sessionRequestFollowUp("a@b.com", "Asha", ["The venue."], REQUEST_ECHO),
    templates.sessionRequestCancelled("a@b.com", "Asha", MODULE),
    templates.sessionCancelled("a@b.com", "Asha", MODULE, "IQC-S0007"),
    templates.newSessionRequestForAdmin("a@b.com", SESSION_SUMMARY),
    templates.consentRequest("a@b.com", "Vikram", ID, CONSENT_DETAILS),
    templates.photoReminder("a@b.com", "Vikram", ID, MODULE),
    templates.ratingRequest("a@b.com", "Asha", ID, RATED_SESSION),
  ];

  it("sends every practitioner-pipeline email from the practitioner mailbox", () => {
    for (const message of practitionerMail()) expect(message.stream).toBe("practitioner");
  });

  it("sends every session email from the session mailbox", () => {
    for (const message of sessionMail()) expect(message.stream).toBe("session");
  });

  it("leaves the console invite on the platform sender", () => {
    // Team access is neither pipeline nor session work.
    expect(templates.adminInvite("a@b.com", ID, "Admin").stream).toBeUndefined();
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

    await sendEmail("trace", templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF), noPersistence);

    expect(sent?.sender?.email).toBe("practitioner@iqcommune.com");
  });

  it("sends the account setup email from the platform address", async () => {
    // Client, 2026-08-13: "account setup email should go from hello". The
    // invite declares no stream, so it resolves through the platform default to
    // BREVO_SENDER_EMAIL. Pinned because that variable is now carrying a
    // requirement rather than the fallback it started as — and because the two
    // dedicated senders are set here, proving they cannot drag the invite off
    // the platform address with them.
    vi.stubEnv("EMAIL_DELIVERY", "live");
    vi.stubEnv("BREVO_API_KEY", "key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "hello@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_SESSION", "session@iqcommune.com");
    vi.stubEnv("BREVO_SENDER_PRACTITIONER", "practitioner@iqcommune.com");

    let sent: { sender?: { email?: string } } | undefined;
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ messageId: "1" }));
    });

    await sendEmail("trace", templates.adminInvite("a@b.com", ID, "Admin"), noPersistence);

    expect(sent?.sender?.email).toBe("hello@iqcommune.com");
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

    await sendEmail("trace", templates.sessionRequestCancelled("a@b.com", "Asha", MODULE), noPersistence);
    expect(sent?.sender?.name).toBe("Session Commune");
    expect(sent?.textContent).toContain("Warm regards,\nTeam iqcommune");

    await sendEmail("trace", templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF), noPersistence);
    expect(sent?.sender?.name).toBe("Practitioner Commune");
    expect(sent?.textContent).toContain("Warm regards,\nTeam iqcommune");
  });

  it("keeps the two cancellations saying different things", () => {
    // One console control cancels a request that was never matched, the other a
    // session that was booked. They shared a body until 2026-08-14, which meant
    // one of the two was always wrong — and the wrong one told someone their
    // session was cancelled when no session had ever existed.
    const request = templates.sessionRequestCancelled("a@b.com", "Asha", MODULE);
    const session = templates.sessionCancelled("a@b.com", "Asha", MODULE, "IQC-S0007");

    expect(request.body).not.toContain("cancelled");
    expect(request.body).toContain(`a session on ${MODULE} forward at this time`);
    expect(session.body).toContain("your confirmed session");
    expect(session.body).toContain("IQC-S0007");
  });

  it("quotes the agreement's own reference, not the practitioner's", () => {
    // IQC-AGR and IQC-EMP are separate sequences. The first revision of the
    // console-messages document put the practitioner's on the agreement email,
    // which sends someone looking for a document that does not exist.
    const agreement = templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF);
    expect(agreement.subject).toContain(AGREEMENT_REF);
    expect(agreement.body).toContain(`Reference for this agreement: ${AGREEMENT_REF}`);
    expect(agreement.body).not.toContain("IQC-EMP");

    const welcome = templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF);
    expect(welcome.body).toContain(`Your empanelment reference: ${PRACTITIONER_REF}`);
  });

  it("names what a follow-up is waiting on, and echoes only what it holds", () => {
    // The list is the message. A follow-up that drops it is a "just checking in"
    // that never gets the venue it exists to ask for.
    const full = templates.sessionRequestFollowUp("a@b.com", "Asha", ["The venue."], REQUEST_ECHO);
    expect(full.body).toContain("- The venue.");
    expect(full.body).toContain("Group: 16-25 participants, Organisations & Institutions");
    expect(full.body).toContain("Preferred window: Early March");
    // No turnaround promise: the waitlist phase withdrew it from the site.
    expect(full.body).not.toContain("working days");

    const sparse = templates.sessionRequestFollowUp("a@b.com", "Asha", ["Your preferred dates."], {
      topic: MODULE,
      audience: "Organisations & Institutions",
    });
    expect(sparse.body).toContain("Group: Organisations & Institutions");
    expect(sparse.body).not.toContain("Preferred window:");
    expect(sparse.body).not.toContain("undefined");
  });

  it("tells the rating recipient their rating stays internal", () => {
    const message = templates.ratingRequest("a@b.com", "Asha", ID, RATED_SESSION);
    expect(message.body).toContain(`the session on ${MODULE} with Vikram Rao`);
    expect(message.body).toContain("never with the practitioner directly");
  });

  it("names the role in the console invite and keeps the single-use warning", () => {
    const message = templates.adminInvite("a@b.com", ID, "Global Admin");
    expect(message.body).toContain("admin console as Global Admin");
    expect(message.body).toContain("This link can only be used once");
    expect(message.body).toContain("expires in 72 hours");
  });

  it("carries all eight shots, from the one list the checklist and PDF also read", () => {
    const message = templates.photoReminder("a@b.com", "Vikram", ID, MODULE);
    for (const [index, shot] of SESSION_SHOTS.entries()) {
      expect(message.body).toContain(`${index + 1}. ${shot.label}: ${shot.note}`);
    }
    expect(message.body).toContain(`Ahead of your session on ${MODULE}`);
  });

  it("opens every console message with Dear, not Hi", () => {
    // One register across the eleven (console-messages doc, rev 2). The two
    // acknowledgment emails are client-verbatim copy and are not in this set.
    const consoleMail = [
      templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF),
      templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF),
      templates.applicationRejected("a@b.com", "Vikram"),
      templates.practitionerDeactivated("a@b.com", "Vikram"),
      templates.consentRequest("a@b.com", "Vikram", ID, CONSENT_DETAILS),
      templates.photoReminder("a@b.com", "Vikram", ID, MODULE),
      templates.sessionRequestFollowUp("a@b.com", "Asha", ["The venue."], REQUEST_ECHO),
      templates.sessionRequestCancelled("a@b.com", "Asha", MODULE),
      templates.sessionCancelled("a@b.com", "Asha", MODULE, "IQC-S0007"),
      templates.ratingRequest("a@b.com", "Asha", ID, RATED_SESSION),
      templates.adminInvite("a@b.com", ID, "Admin"),
    ];
    expect(consoleMail).toHaveLength(11);
    for (const message of consoleMail) {
      expect(message.body.startsWith("Dear ")).toBe(true);
      expect(message.body.endsWith("Warm regards,\nTeam iqcommune")).toBe(true);
      expect(message.subject).toContain("iqcommune");
    }
  });

  it("leaves no per-stream sign-off behind", () => {
    // The 2026-08-13 ask was consistency, so the guard is the absence of the
    // old names: a template quietly reintroducing one is the regression.
    const bodies = [
      templates.sessionRequestCancelled("a@b.com", "Asha", MODULE).body,
      templates.practitionerWelcome("a@b.com", "Vikram", PRACTITIONER_REF).body,
      templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF).body,
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
    const welcome = templates.onboardingLink("a@b.com", "Vikram", ID, AGREEMENT_REF);
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
