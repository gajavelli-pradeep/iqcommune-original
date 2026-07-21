import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Faqs } from "./Faqs";

describe("Faqs", () => {
  it("renders all nine questions as buttons", () => {
    render(<Faqs />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("starts fully collapsed", () => {
    render(<Faqs />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens an answer and announces it", async () => {
    const user = userEvent.setup();
    render(<Faqs />);
    const question = screen.getByRole("button", {
      name: /How do I register if I have a group\?/,
    });

    await user.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/One person from your group registers as the SPOC/),
    ).toBeVisible();
  });

  it("closes the previous answer when another opens", async () => {
    const user = userEvent.setup();
    render(<Faqs />);
    const [first, second] = screen.getAllByRole("button");

    await user.click(first);
    await user.click(second);

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an open answer when its own question is clicked again", async () => {
    const user = userEvent.setup();
    render(<Faqs />);
    const [first] = screen.getAllByRole("button");

    await user.click(first);
    await user.click(first);

    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps every answer in the DOM while collapsed", () => {
    // An accordion is progressive disclosure, not deletion — the parity gate
    // must still find the words.
    render(<Faqs />);
    expect(
      screen.getByText(/This is a firm policy, not a preference/),
    ).toBeInTheDocument();
  });

  it("wires each panel to its question for assistive tech", () => {
    render(<Faqs />);
    const button = screen.getAllByRole("button")[0];
    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toHaveAttribute(
      "aria-labelledby",
      button.id,
    );
  });
});
