import { describe, expect, it } from "vitest";

import { suggestEmailDomain } from "@/lib/email/suggest-domain";
import { applicationSchema } from "@/lib/schemas/application";
import { sessionRequestSchema } from "@/lib/schemas/session-request";

/**
 * What the forms accept as an email address, written down.
 *
 * The rule is the same on both forms, and the question it kept raising was
 * whether a company address would be turned away. It is not: the check is on
 * the shape, never the domain, so anything deliverable gets through.
 */

const ACCEPTED = [
  ["vikram@gmail.com", "plain"],
  ["v.kulkarni@hdfcamc.com", "company"],
  ["vikram+iq@gmail.com", "plus tag"],
  ["contact@st-xaviers.edu.in", "hyphen and multi-part TLD"],
  ["first.last@sub.domain.co.in", "subdomain"],
  ["VIKRAM@GMAIL.COM", "uppercase"],
  ["  vikram@gmail.com  ", "surrounding spaces"],
  ["user_name@my-firm.io", "underscore and hyphen"],
  ["ceo@really-long-company-name-limited.consulting", "long modern TLD"],
] as const;

const REJECTED = [
  ["vikram@gmail", "no TLD"],
  ["vikram.gmail.com", "no @"],
  ["@gmail.com", "no local part"],
  ["vikram@", "no domain"],
  ["vik ram@gmail.com", "space inside"],
  ["vikram@@gmail.com", "double @"],
  ["vikram@gmail..com", "consecutive dots"],
  ["vikram@.gmail.com", "leading dot"],
  ["vikram@gmail.com.", "trailing dot"],
  ["vikram@gmail.com\nBcc: everyone@example.com", "header injection"],
] as const;

describe("email addresses the forms accept", () => {
  for (const [value, note] of ACCEPTED) {
    it(`accepts ${note}`, () => {
      expect(applicationSchema.shape.email.safeParse(value).success).toBe(true);
      expect(sessionRequestSchema.shape.email.safeParse(value).success).toBe(true);
    });
  }

  for (const [value, note] of REJECTED) {
    it(`rejects ${note}`, () => {
      expect(applicationSchema.shape.email.safeParse(value).success).toBe(false);
      expect(sessionRequestSchema.shape.email.safeParse(value).success).toBe(false);
    });
  }

  it("normalises before storing", () => {
    // Both forms lowercase and trim, so the same person cannot arrive twice
    // under two spellings of one address.
    expect(applicationSchema.shape.email.parse("  Vikram@Gmail.COM ")).toBe("vikram@gmail.com");
  });
});

describe("typo suggestions", () => {
  it("spots a mistyped provider and offers the whole address back", () => {
    // The realistic "not a real email": valid shape, domain nobody owns.
    expect(suggestEmailDomain("vikram@gmial.com")).toBe("vikram@gmail.com");
    expect(suggestEmailDomain("vikram@gmai.com")).toBe("vikram@gmail.com");
    expect(suggestEmailDomain("asha@yahooo.com")).toBe("asha@yahoo.com");
    expect(suggestEmailDomain("asha@hotmial.com")).toBe("asha@hotmail.com");
    expect(suggestEmailDomain("asha@outlok.com")).toBe("asha@outlook.com");
  });

  it("says nothing about an address that is already right", () => {
    for (const [value] of ACCEPTED) expect(suggestEmailDomain(value)).toBeUndefined();
  });

  it("leaves company domains alone", () => {
    // The failure that would matter: telling a real practitioner their own work
    // address is wrong. Suggesting is harmless; suggesting constantly is not.
    for (const address of [
      "v.kulkarni@hdfcamc.com",
      "ceo@mirae-asset.co.in",
      "contact@st-xaviers.edu.in",
      "partner@axissecurities.in",
      "hello@iqcommune.com",
    ]) {
      expect(suggestEmailDomain(address)).toBeUndefined();
    }
  });

  it("stays quiet while someone is still typing", () => {
    for (const partial of ["", "v", "vikram", "vikram@", "vikram@g", "@gmail.com"]) {
      expect(suggestEmailDomain(partial)).toBeUndefined();
    }
  });
});
