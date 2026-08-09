import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinkPageShell } from "./LinkPageShell";

/**
 * The closing "questions?" line is the only address on the six emailed pages,
 * and it had no prop at all until the client's mailboxes went live — the
 * `mailto:` was written into the markup twice, as href and as label.
 */
describe("LinkPageShell", () => {
  const shell = () => (
    <LinkPageShell badge="Session Feedback" width="720px">
      <p>body</p>
    </LinkPageShell>
  );

  it("points the closing question line at CONTACT_EMAIL", () => {
    vi.stubEnv("CONTACT_EMAIL", "desk@iqcommune.com");
    try {
      render(shell());
      expect(screen.getByRole("link", { name: "desk@iqcommune.com" })).toHaveAttribute(
        "href",
        "mailto:desk@iqcommune.com",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("falls back to the site's inbox when the variable is unset", () => {
    // Why the resolver uses a literal default rather than `requireEnv`: an
    // unset variable has to render the right address, never `mailto:undefined`
    // on a page someone reached from an email about their own session.
    render(shell());
    expect(screen.getByRole("link", { name: "hello@iqcommune.com" })).toHaveAttribute(
      "href",
      "mailto:hello@iqcommune.com",
    );
  });
});
