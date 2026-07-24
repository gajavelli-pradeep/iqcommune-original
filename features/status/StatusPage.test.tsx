import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPage } from "./StatusPage";

describe("StatusPage", () => {
  it("shows the applicant's status when the token verified", () => {
    render(
      <StatusPage
        status={{
          firstName: "Ananya",
          headline: "You're empanelled!",
          detail: "Welcome to the iqcommune practitioner network.",
          appliedOn: "12 Jul 2026",
        }}
      />,
    );

    expect(screen.getByText("You're empanelled!")).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the iqcommune practitioner network\./)).toBeInTheDocument();
    expect(screen.getByText(/Hi Ananya — applied on 12 Jul 2026\./)).toBeInTheDocument();
  });

  it("shows the shared invalid-link state when the token did not verify", () => {
    render(<StatusPage failure="expired" />);

    expect(screen.getByText("This link has expired")).toBeInTheDocument();
  });

  it("falls back to the invalid-link state if neither prop is given", () => {
    render(<StatusPage />);

    expect(screen.getByText("This link isn't complete")).toBeInTheDocument();
  });
});
