import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AccountSetupForm, type AdminInvite } from "./AccountSetupForm";

const INVITE: AdminInvite = { email: "sandhya.rao@iqcommune.com", role: "Admin" };

describe("AccountSetupForm", () => {
  it("shows the invited email and role without letting them be edited", () => {
    // Someone who could choose their own role here could invite themselves to
    // be an admin, so neither field is an input.
    render(<AccountSetupForm invite={INVITE} />);
    expect(screen.getByText("sandhya.rao@iqcommune.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Role/)).not.toBeInTheDocument();
  });

  it("rejects a password under eight characters", async () => {
    const user = userEvent.setup();
    render(<AccountSetupForm invite={INVITE} />);

    await user.type(screen.getByLabelText("Create a password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Activate account" }));

    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("rejects a mismatched confirmation", async () => {
    const user = userEvent.setup();
    render(<AccountSetupForm invite={INVITE} />);

    await user.type(screen.getByLabelText("Create a password"), "a-long-enough-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-different-password");
    await user.click(screen.getByRole("button", { name: "Activate account" }));

    expect(screen.getByText("Passwords don't match — check and try again.")).toBeInTheDocument();
  });

  it("confirms activation once both passwords agree", async () => {
    const user = userEvent.setup();
    render(<AccountSetupForm invite={INVITE} />);

    await user.type(screen.getByLabelText("Create a password"), "a-long-enough-password");
    await user.type(screen.getByLabelText("Confirm password"), "a-long-enough-password");
    await user.click(screen.getByRole("button", { name: "Activate account" }));

    expect(screen.getByRole("heading", { name: "Account activated" })).toBeInTheDocument();
  });

  it("masks both password fields", () => {
    render(<AccountSetupForm invite={INVITE} />);
    expect(screen.getByLabelText("Create a password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "password");
  });
});
