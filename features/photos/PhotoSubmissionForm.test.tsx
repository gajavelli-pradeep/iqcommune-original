import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PhotoSubmissionForm, type PhotoSession } from "./PhotoSubmissionForm";

const SESSION: PhotoSession = {
  practitioner: "Vikram Kulkarni",
  practitionerRole: "Equity Analyst · Kotak Securities · Mumbai",
  practitionerRef: "IQC-EMP-0042",
  sessionDate: "20 Jun 2025",
  module: "Equity Investing Simplified",
  city: "Mumbai",
  state: "Maharashtra",
  sessionId: "IQC-S003",
};

const photo = () => new File(["x"], "room.jpg", { type: "image/jpeg" });

describe("PhotoSubmissionForm", () => {
  it("shows the session rather than asking for it", () => {
    // The token names the row; nothing here is typed by the practitioner, so
    // nothing here can be forged by editing the URL.
    render(<PhotoSubmissionForm session={SESSION} />);
    expect(screen.getByText("Vikram Kulkarni")).toBeInTheDocument();
    expect(screen.getByText("IQC-S003")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Your name/)).not.toBeInTheDocument();
  });

  it("refuses to submit without photos or without consent", async () => {
    const user = userEvent.setup();
    render(<PhotoSubmissionForm session={SESSION} />);

    await user.click(screen.getByRole("button", { name: "Submit photos for review" }));
    expect(screen.getByText("Add at least one photo")).toBeInTheDocument();
    expect(
      screen.getByText("Participant consent is required before submitting"),
    ).toBeInTheDocument();
  });

  it("keeps the shot checklist out of the submission", async () => {
    const user = userEvent.setup();
    render(<PhotoSubmissionForm session={SESSION} />);

    // Ticking is a memory aid, not data — it must not gate the submit.
    await user.upload(screen.getByLabelText("Choose session photos"), photo());
    await user.click(screen.getByRole("checkbox", { name: /participants were informed/ }));
    await user.click(screen.getByRole("button", { name: "Submit photos for review" }));

    expect(screen.getByRole("heading", { name: "Photos received. Thank you." })).toBeInTheDocument();
  });

  it("states retention and status on the receipt", async () => {
    const user = userEvent.setup();
    render(<PhotoSubmissionForm session={SESSION} />);

    await user.upload(screen.getByLabelText("Choose session photos"), photo());
    await user.click(screen.getByRole("checkbox", { name: /participants were informed/ }));
    await user.click(screen.getByRole("button", { name: "Submit photos for review" }));

    expect(screen.getByText("Storage expiry")).toBeInTheDocument();
    expect(screen.getByText("✓ Received — pending review")).toBeInTheDocument();
    expect(screen.getByText(/deleted automatically at expiry/)).toBeInTheDocument();
  });
});
