import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PendingSendToast } from "./PendingSendToast";
import { UNDO_WINDOW_SECONDS } from "@/hooks/useDeferredSend";

/**
 * The sentence an admin reads while a send is held.
 *
 * The hook's own tests prove the window is ten seconds and counts down; none of
 * them look at the words. This is the half that reaches a person — shortening
 * the window is only a change if the toast says so — and it was the only part
 * of the feature with no coverage at all.
 *
 * The number is read from the constant rather than written out, so this asserts
 * the toast and the window agree instead of asserting ten twice.
 */
describe("PendingSendToast", () => {
  it("offers the whole window when one opens", () => {
    render(
      <PendingSendToast
        pending={{ label: "Cancelling IQC-S0007…", secondsLeft: UNDO_WINDOW_SECONDS }}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByText(`Sending in ${UNDO_WINDOW_SECONDS} seconds — click Undo to stop it`)).toBeInTheDocument();
    // The label is what says *which* action is being held, so it must survive.
    expect(screen.getByText("Cancelling IQC-S0007…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("drops the plural on the last second", () => {
    // "Sending in 1 seconds" is the kind of thing that survives a rewrite of the
    // number it was written around.
    render(<PendingSendToast pending={{ label: "Sending…", secondsLeft: 1 }} onUndo={vi.fn()} />);

    expect(screen.getByText("Sending in 1 second — click Undo to stop it")).toBeInTheDocument();
  });
});
