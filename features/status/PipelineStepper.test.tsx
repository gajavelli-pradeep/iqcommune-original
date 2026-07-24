import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PipelineStepper } from "./PipelineStepper";

const STEPS = ["Applied", "Screening Done", "Agreement Sent", "Empanelled"];

describe("PipelineStepper", () => {
  it("marks steps before current as done, current as active, later as pending", () => {
    render(<PipelineStepper steps={STEPS} current={1} />);

    expect(screen.getAllByText("✓")).toHaveLength(1);
    expect(screen.getByText("(in progress)")).toBeInTheDocument();
    // Pending steps (Agreement Sent, Empanelled) still show their 1-based number.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("marks every step done, with no in-progress marker, once current passes the last index", () => {
    render(<PipelineStepper steps={STEPS} current={STEPS.length} />);

    expect(screen.getAllByText("✓")).toHaveLength(STEPS.length);
    expect(screen.queryByText("(in progress)")).not.toBeInTheDocument();
  });

  it("renders every step label top to bottom", () => {
    render(<PipelineStepper steps={STEPS} current={0} />);

    for (const step of STEPS) expect(screen.getByText(step)).toBeInTheDocument();
  });
});
