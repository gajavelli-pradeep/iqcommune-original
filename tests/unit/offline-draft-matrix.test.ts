import { describe, expect, it } from "vitest";

import { draftSessionMailto } from "@/features/landing/sections/RequestModal";
import { draftApplicationMailto } from "@/features/practitioners/ApplyModalBody";
import { MODULES, type ApplicationInput } from "@/lib/schemas/application";
import { AUDIENCES, type SessionRequestInput } from "@/lib/schemas/session-request";

/**
 * The offline drafts across the whole input space, not the handful of cases
 * that happened to get written down.
 *
 * Every earlier defect here was a combination nobody tried: all six modules with
 * a long note, every field at its schema maximum, a consent box left untouched.
 * This walks the combinations and asserts the four things that must hold for any
 * of them.
 */

/** Windows' shell handler truncates past ~2,048 characters, silently. */
const MAILTO_CEILING = 2048;

const ADDRESS = "practitioner@iqcommune.com";

/** A label with nothing after it means a field was printed empty. */
const EMPTY_FIELD = /\n[A-Z][^:\n]*: *(\r?\n|$)/;

const SHORT = "a";
const LONG = "x".repeat(2000);
/** Characters that break a URL if the encoding is ever dropped. */
const NASTY = "Ampersand & plus + hash # slash / quote \" apostrophe ' equals =";

function checkInvariants(href: string, mustContain: string[]) {
  expect(href.startsWith(`mailto:${ADDRESS}?`) || href.startsWith("mailto:session@")).toBe(true);
  expect(href.length).toBeLessThanOrEqual(MAILTO_CEILING);
  expect(href).not.toContain("undefined");

  const decoded = decodeURIComponent(href);
  expect(decoded).not.toMatch(EMPTY_FIELD);
  for (const value of mustContain) expect(decoded).toContain(value);
}

const application = (over: Partial<ApplicationInput> = {}): ApplicationInput => ({
  firstName: "Vikram",
  lastName: "Kulkarni",
  email: "vikram@example.com",
  phone: "+91 98765 43210",
  jobTitle: "Equity Analyst",
  experience: "5 – 8 years",
  city: "Mumbai",
  state: "Maharashtra",
  address: "12 Marine Drive",
  tshirtSize: "M",
  modules: [MODULES[0]],
  frequency: "Once a month",
  motivation: "Because I enjoy it.",
  consentDisclosure: true,
  consentNoCrossSell: true,
  consentEmployer: true,
  ...over,
});

const request = (over: Partial<SessionRequestInput> = {}): SessionRequestInput =>
  ({
    audience: "individual",
    firstName: "Asha",
    lastName: "Rao",
    email: "asha@example.com",
    phone: "+91 90000 00000",
    city: "Pune",
    state: "Maharashtra",
    organisationName: "",
    topic: "Equity Investing Simplified",
    groupSize: "",
    preferredWindow: "",
    venueDetails: "",
    notes: "",
    spocConfirmed: false,
    ...over,
  }) as SessionRequestInput;

describe("application draft, across the input space", () => {
  // 1 through 6 modules, against a short and an over-long motivation. The
  // combination that used to lose modules is (6 modules, long motivation).
  for (const count of [1, 2, 3, 4, 5, 6]) {
    for (const [label, motivation] of [
      ["short note", SHORT],
      ["over-long note", LONG],
    ] as const) {
      it(`keeps all ${count} chosen module(s) with a ${label}`, () => {
        const modules = MODULES.slice(0, count);
        const href = draftApplicationMailto(application({ modules, motivation }), ADDRESS);
        checkInvariants(href, [...modules]);
      });
    }
  }

  it("survives characters that would break an unencoded URL", () => {
    const href = draftApplicationMailto(
      application({ firstName: NASTY, jobTitle: NASTY, address: NASTY }),
      ADDRESS,
    );
    checkInvariants(href, []);
    // The query separators must come from the template, never from the data.
    expect(href.split("?")).toHaveLength(2);
    expect(href.split("&body=")).toHaveLength(2);
  });

  it("prints no empty label when every optional-looking field is minimal", () => {
    const href = draftApplicationMailto(
      application({ jobTitle: SHORT, address: SHORT, motivation: SHORT }),
      ADDRESS,
    );
    checkInvariants(href, ["Modules:"]);
  });
});

describe("session draft, across the input space", () => {
  for (const audience of AUDIENCES) {
    for (const spocConfirmed of [false, true]) {
      it(`handles ${audience} with SPOC ${spocConfirmed ? "ticked" : "unticked"}`, () => {
        const href = draftSessionMailto(
          request({ audience, spocConfirmed }),
          audience,
          "session@iqcommune.com",
        );
        checkInvariants(href, ["Equity Investing Simplified"]);
        // The consent sentence follows the box, never the audience.
        expect(decodeURIComponent(href).includes("responsibility of a SPOC")).toBe(spocConfirmed);
      });
    }
  }

  it("keeps a long bundle topic whole", () => {
    // Bundles are the longest topic and say what the session actually is.
    const topic =
      "Bundle — Foundations of Personal Finance + Retirement & Goal-Based Financial Planning (6 hrs)";
    const href = draftSessionMailto(
      request({ topic, notes: LONG, venueDetails: LONG }),
      "corporate",
      "session@iqcommune.com",
    );
    checkInvariants(href, [topic]);
  });

  it("omits every optional field left blank, rather than printing it empty", () => {
    const href = draftSessionMailto(request(), "individual", "session@iqcommune.com");
    const decoded = decodeURIComponent(href);
    for (const label of ["Organisation", "Group size", "Preferred window", "Venue", "Notes"]) {
      expect(decoded).not.toContain(`${label}:`);
    }
  });

  it("survives characters that would break an unencoded URL", () => {
    const href = draftSessionMailto(
      request({ firstName: NASTY, organisationName: NASTY, notes: NASTY }),
      "corporate",
      "session@iqcommune.com",
    );
    checkInvariants(href, []);
    expect(href.split("?")).toHaveLength(2);
    expect(href.split("&body=")).toHaveLength(2);
  });
});
