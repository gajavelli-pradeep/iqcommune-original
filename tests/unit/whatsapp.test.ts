import { beforeEach, describe, expect, it, vi } from "vitest";

import * as whatsapp from "@/lib/whatsapp/templates";

/**
 * The WhatsApp copy, held against the delivered document.
 *
 * The email half has its own suite; this one guards what is specific to the
 * channel — the informal register the document keeps deliberately, the single
 * "— iqcommune team" sign-off, and the greeting that varies in three ways.
 */

const ID = "a4a7e0eb-dc63-4ca3-b779-2bd1a57f318e";
const AGREEMENT_REF = "IQC-AGR-0007";
const MODULE = "Equity Investing Simplified";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://iqcommune.example");
  vi.stubEnv("HMAC_SECRET", "0".repeat(64));
});

const every = () => [
  whatsapp.onboardingLink("Asha", ID, AGREEMENT_REF),
  whatsapp.practitionerWelcome("Asha"),
  whatsapp.applicationRejected("Asha"),
  whatsapp.practitionerDeactivated("Asha"),
  whatsapp.consentRequest("Asha", ID, { module: MODULE, confirmationReference: "IQC-CONF-0012" }),
  whatsapp.photoReminder("Asha", ID, MODULE),
  whatsapp.sessionRequestFollowUp("Asha", {
    topic: MODULE,
    audience: "Organisations & Institutions",
    groupSize: "16-25",
    preferredWindow: "Early March",
  }),
  whatsapp.sessionCancelled("Asha", MODULE, "IQC-S0007"),
  whatsapp.ratingRequest("Asha", ID, { module: MODULE, practitionerName: "Vikram Rao" }),
  whatsapp.adminInvite(ID, "Global Admin"),
];

describe("WhatsApp copy", () => {
  it("covers the ten sends the document writes, and no more", () => {
    // The eleventh, `sessionRequestCancelled`, has no WhatsApp body in the
    // document — the dialog hides the tab rather than inventing one.
    expect(every()).toHaveLength(10);
    expect(Object.keys(whatsapp).filter((name) => name !== "default")).toHaveLength(10);
  });

  it("opens as iqcommune and signs off the informal way, every time", () => {
    for (const message of every()) {
      expect(message.body.startsWith("Hi")).toBe(true);
      expect(message.body.endsWith("— iqcommune team")).toBe(true);
      // The email's two-line block must never leak into this register.
      expect(message.body).not.toContain("Warm regards");
    }
  });

  it("names the person, except on the invite, which has no name to use", () => {
    expect(whatsapp.practitionerDeactivated("Asha").body.startsWith("Hi Asha, this is iqcommune.")).toBe(true);
    // Two openers carry the document's exclamation mark.
    expect(whatsapp.practitionerWelcome("Asha").body.startsWith("Hi Asha, this is iqcommune! 🎉")).toBe(true);
    expect(
      whatsapp
        .sessionRequestFollowUp("Asha", { topic: MODULE, audience: "Organisations & Institutions" })
        .body.startsWith("Hi Asha, this is iqcommune!"),
    ).toBe(true);
    // An invitation stores an address and a role, never a name.
    expect(whatsapp.adminInvite(ID, "Admin").body.startsWith("Hi, this is iqcommune.")).toBe(true);
  });

  it("quotes the agreement's own reference, as the email does", () => {
    // Same rule as the email half: IQC-AGR identifies the document being sent,
    // and the practitioner's IQC-EMP does not exist until they sign it.
    const message = whatsapp.onboardingLink("Asha", ID, AGREEMENT_REF);
    expect(message.body).toContain(`Your empanelment agreement (Ref. ${AGREEMENT_REF}) is ready`);
    expect(message.body).not.toContain("IQC-EMP");
  });

  it("agrees the article with the role", () => {
    expect(whatsapp.adminInvite(ID, "Global Admin").body).toContain("as a Global Admin");
    expect(whatsapp.adminInvite(ID, "Admin").body).toContain("as an Admin");
    expect(whatsapp.adminInvite(ID, "User").body).toContain("as a User");
  });

  it("keeps the request echo together and drops what it does not hold", () => {
    const full = whatsapp.sessionRequestFollowUp("Asha", {
      topic: MODULE,
      audience: "Organisations & Institutions",
      groupSize: "16-25",
      preferredWindow: "Early March",
    });
    // One block, single-newline separated — a blank line between them would
    // read as two paragraphs rather than a summary.
    expect(full.body).toContain(
      "Your group: 16-25 participants · Organisations & Institutions\nPreferred: Early March",
    );
    // WhatsApp bold, not a stray asterisk.
    expect(full.body).toContain(`*${MODULE}*`);

    const sparse = whatsapp.sessionRequestFollowUp("Asha", {
      topic: MODULE,
      audience: "Organisations & Institutions",
    });
    expect(sparse.body).toContain("Your group: Organisations & Institutions");
    expect(sparse.body).not.toContain("Preferred:");
    expect(sparse.body).not.toContain("undefined");
  });

  it("carries a real link wherever the copy promises one", () => {
    const linked = [
      whatsapp.onboardingLink("Asha", ID, AGREEMENT_REF),
      whatsapp.consentRequest("Asha", ID, { module: MODULE, confirmationReference: "IQC-CONF-0012" }),
      whatsapp.photoReminder("Asha", ID, MODULE),
      whatsapp.ratingRequest("Asha", ID, { module: MODULE, practitionerName: "Vikram Rao" }),
      whatsapp.adminInvite(ID, "Admin"),
    ];
    for (const message of linked) {
      expect(message.body).toContain("https://iqcommune.example/");
      // Same contract as the email links (ADR 0004): the raw id never appears.
      expect(message.body).not.toContain(ID);
    }
  });

  it("pairs each body with its email template id, so a send traces as one thing", () => {
    expect(whatsapp.ratingRequest("Asha", ID, { module: MODULE, practitionerName: "V" }).template).toBe(
      "rating-request",
    );
    expect(whatsapp.onboardingLink("Asha", ID, AGREEMENT_REF).template).toBe("onboarding-link");
  });
});
