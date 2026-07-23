import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MobileNav } from "./MobileNav";

/**
 * The drawer covers the page, and every requirement below follows from that:
 * the page behind it must not scroll, Tab must not walk onto what it covers,
 * and every way of dismissing it must put the page back exactly as it was.
 *
 * Geometry — the 44px targets, the slide, the panel filling the viewport — is
 * not assertable in jsdom, which has no layout. Those are verified in the
 * browser; see the e2e nav spec.
 */

const LINKS = [
  { href: "#who-its-for", label: "Who it's for" },
  { href: "/practitioners", label: "For practitioners" },
] as const;

const setup = () =>
  render(<MobileNav links={LINKS} action={<button type="button">Request a Session</button>} />);

const drawer = () => screen.queryByRole("dialog", { name: "Site menu" });

describe("MobileNav", () => {
  it("starts closed, and says so to a screen reader", () => {
    setup();
    expect(drawer()).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens with every link and the page's action", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const panel = drawer()!;
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Who it's for" })).toHaveAttribute(
      "href",
      "#who-its-for",
    );
    expect(within(panel).getByRole("link", { name: "For practitioners" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Request a Session" })).toBeInTheDocument();
  });

  it("locks the page behind it and gives the scroll back on close", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus in on open and back to the hamburger on close", async () => {
    const user = userEvent.setup();
    setup();
    const opener = screen.getByRole("button", { name: "Open menu" });

    await user.click(opener);
    expect(drawer()).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(drawer()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on the scrim, which is a real button so a pointer and a reader agree", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // Two "Close menu" controls: the scrim behind, the ✕ inside. Either works.
    await user.click(screen.getAllByRole("button", { name: "Close menu" })[0]);
    expect(drawer()).toBeNull();
  });

  it("closes when a link is followed, so the drawer is never left over the target", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));

    await user.click(screen.getByRole("link", { name: "Who it's for" }));
    expect(drawer()).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps Tab inside the panel", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const panel = drawer()!;

    // Well past the number of focusables, so a leak would have escaped by now.
    for (let i = 0; i < 12; i++) await user.tab();
    expect(panel.contains(document.activeElement)).toBe(true);
  });
});
