import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("points the practitioner call-to-action at /practitioners", () => {
    render(<SiteFooter />);
    expect(
      screen.getByRole("link", {
        name: /Teach what you practise — join the iqcommune practitioner network/,
      }),
    ).toHaveAttribute("href", "/practitioners");
  });

  it("shows the contact address as plain text, not a link", () => {
    // Client, 2026-07-23. Asserted rather than left implicit: it was a mailto
    // for eight pages' worth of history, and a stray re-link would look right.
    render(<SiteFooter />);
    expect(screen.getByText("hello@iqcommune.com")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "hello@iqcommune.com" })).toBeNull();
  });

  it("carries the spec copy verbatim", () => {
    render(<SiteFooter />);
    expect(screen.getByText("Are you a finance professional?")).toBeInTheDocument();
  });

  /**
   * The client's standard footer (2026-07-23). Asserted as the whole line, not
   * as three separate elements, because the requirement is the line — an
   * earlier footer had the right words in the wrong order and read fine in
   * isolation.
   */
  it("renders the standard first line: both documents, then the inbox", () => {
    const { container } = render(<SiteFooter />);
    const line = [...container.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("Privacy Policy"),
    );
    expect(line?.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Privacy Policy · Terms of Use · hello@iqcommune.com",
    );
  });

  it("renders the current year, so the footer never looks abandoned", () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year}. InvestQ Commune. All Rights Reserved`),
    ).toBeInTheDocument();
  });

  it("opens each document in a dialog and closes it again", async () => {
    const user = userEvent.setup();
    render(<SiteFooter />);

    for (const title of ["Privacy Policy", "Terms of Use"]) {
      await user.click(screen.getByRole("button", { name: title }));

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: title })).toBeInTheDocument();
      // The document body actually arrived, not just the chrome. `getAll`
      // because the prose names the company throughout — a unique match here
      // would be asserting that it does not.
      expect(within(dialog).getAllByText(/InvestQ Commune/).length).toBeGreaterThan(3);

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).toBeNull();
    }
  });
});
