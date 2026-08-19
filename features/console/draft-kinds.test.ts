import { describe, expect, it } from "vitest";

import { LINK_PLACEHOLDER, withLink } from "./draft-kinds";

/**
 * The agreement and the invite carry a one-time link to a row that does not
 * exist until the send — both mint a real id in the dialog itself, so the
 * link previewed is the link that goes out. `withLink` is what still matters
 * to test: an admin can edit the body, so the real token has to land wherever
 * the draft happened to put its own, not just where a placeholder would be.
 */

const LIVE = "https://iqcommune.com/onboarding?t=eyJhbGciOiJIUzI1NiJ9.abc-123_XY";

/**
 * A different token for the same agreement — what the dialog rendered a moment
 * before the send minted `LIVE`. Tokens are HMACs over `{kind, id, exp}`, so two
 * mints for one agreement differ in the string and match in what they open.
 */
const PREVIOUS = "https://iqcommune.com/onboarding?t=eyJhbGciOiJIUzI1NiJ9.zzz-999_QQ";

const countOf = (haystack: string, needle: string) => haystack.split(needle).length - 1;

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

  it("replaces a link the draft already showed, rather than adding a second", () => {
    // The case the agreement resend introduced: its draft shows a real link,
    // because the agreement it points at already exists. That body matches no
    // placeholder, so without this it would fall through to the append and the
    // practitioner would get the same link twice — under a sentence written for
    // one.
    const shown = `Hi Vikram,\n\nSign here:\n\n${PREVIOUS}\n\n- Team iqcommune`;

    const sent = withLink(shown, LIVE);

    expect(sent).toBe(`Hi Vikram,\n\nSign here:\n\n${LIVE}\n\n- Team iqcommune`);
    expect(sent).not.toContain(PREVIOUS);
    expect(countOf(sent, LIVE)).toBe(1);
  });

  it("sends the token this send minted, not the one the dialog rendered", () => {
    // Both tokens are valid — they are HMACs over the same agreement id — so
    // this is not about access. It is about the sent email and the send's own
    // record agreeing on which link went out.
    expect(withLink(`Sign here: ${PREVIOUS}`, LIVE)).toBe(`Sign here: ${LIVE}`);
  });

  it("does not lose the tail of a body when it replaces a shown link", () => {
    // A global regex keeps `lastIndex` between calls, so a `test()` before a
    // `replace()` can start the search mid-string and quietly skip the match.
    // Two runs in a row is what catches that.
    const shown = `Sign here: ${PREVIOUS}\n\n- Team iqcommune`;

    expect(withLink(shown, LIVE)).toBe(`Sign here: ${LIVE}\n\n- Team iqcommune`);
    expect(withLink(shown, LIVE)).toBe(`Sign here: ${LIVE}\n\n- Team iqcommune`);
  });
});
