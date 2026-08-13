import { describe, expect, it } from "vitest";

import { LINK_PLACEHOLDER, maskLink, withLink } from "./draft-kinds";

/**
 * The agreement and the invite carry a one-time link to a row that does not
 * exist until the send. The draft therefore shows a placeholder and the real
 * link is put back on the way out.
 *
 * Both directions matter and fail in opposite ways: a mask that misses leaks a
 * live token into a preview that may be abandoned, and a substitution that
 * misses ships an email whose only purpose was to carry the link.
 */

const LIVE = "https://iqcommune.com/onboarding?t=eyJhbGciOiJIUzI1NiJ9.abc-123_XY";

describe("maskLink", () => {
  it("takes the token out of a composed body", () => {
    const body = `Hi Vikram,\n\nSign here:\n\n${LIVE}\n\n- Team iqcommune`;

    const masked = maskLink(body);

    expect(masked).not.toContain(LIVE);
    expect(masked).not.toContain("?t=");
    expect(masked).toContain(LINK_PLACEHOLDER);
    // Only the URL goes; the copy around it is what the admin came to read.
    expect(masked).toContain("Hi Vikram,");
    expect(masked).toContain("- Team iqcommune");
  });

  it("leaves a body with no link alone", () => {
    const body = "Hi Vikram,\n\nWelcome aboard.\n\n- Team iqcommune";
    expect(maskLink(body)).toBe(body);
  });
});

describe("withLink", () => {
  it("puts the real link exactly where the placeholder sat", () => {
    const edited = `Hi Vikram,\n\nSign here:\n\n${LINK_PLACEHOLDER}\n\nThanks.`;

    const sent = withLink(edited, LIVE);

    expect(sent).toBe(`Hi Vikram,\n\nSign here:\n\n${LIVE}\n\nThanks.`);
    expect(sent).not.toContain(LINK_PLACEHOLDER);
  });

  it("appends the link when the admin deleted the placeholder", () => {
    // The whole point of these two emails is the link, so losing it silently
    // is worse than a body that reads slightly oddly.
    const edited = "Hi Vikram,\n\nSign the agreement please.";

    const sent = withLink(edited, LIVE);

    expect(sent).toContain(LIVE);
    expect(sent).toBe(`${edited}\n\n${LIVE}`);
  });

  it("replaces every placeholder if the admin pasted a second one", () => {
    const edited = `${LINK_PLACEHOLDER}\n\nor here: ${LINK_PLACEHOLDER}`;

    const sent = withLink(edited, LIVE);

    expect(sent).not.toContain(LINK_PLACEHOLDER);
    expect(sent.match(new RegExp(LIVE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(2);
  });

  it("round-trips: mask then restore returns the original body", () => {
    const original = `Hi Vikram,\n\nSign here:\n\n${LIVE}\n\n- Team iqcommune`;

    expect(withLink(maskLink(original), LIVE)).toBe(original);
  });
});
