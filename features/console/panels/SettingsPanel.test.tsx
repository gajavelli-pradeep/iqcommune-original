import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const setHomeGalleryVisible = vi.fn(async (visible: boolean) => ({
  ok: true as const,
  message: visible ? "shown" : "hidden",
}));
vi.mock("../actions", () => ({
  inviteTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  setHomeGalleryVisible: (visible: boolean) => setHomeGalleryVisible(visible),
  composeDraft: vi.fn(),
  recordWhatsAppOpened: vi.fn(),
}));

const { SettingsPanel } = await import("./SettingsPanel");
const { can } = await import("../roles");

const show = (role: "global_admin" | "admin" | "user", galleryVisible = true) =>
  render(<SettingsPanel role={role} team={[]} masterData={[]} galleryVisible={galleryVisible} />);

describe("home page gallery switch", () => {
  it("is a Global Admin capability and nobody else's", () => {
    expect(can("global_admin", "manageTeam")).toBe(true);
    expect(can("admin", "manageTeam")).toBe(false);
    expect(can("user", "manageTeam")).toBe(false);
  });

  it("shows for a Global Admin only, as the one switch on the tab", () => {
    show("global_admin");
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    expect(screen.getByRole("switch", { name: "Sessions in the room" })).toBeTruthy();
  });

  it.each(["admin", "user"] as const)("is not rendered for %s", (role) => {
    show(role);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText("Home page sections")).toBeNull();
  });

  it("saves only the gallery flag when switched", async () => {
    show("global_admin", true);
    fireEvent.click(screen.getByRole("switch", { name: "Sessions in the room" }));
    await waitFor(() => expect(setHomeGalleryVisible).toHaveBeenCalledWith(false));
    expect(setHomeGalleryVisible).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Sessions in the room" }).getAttribute("aria-checked")).toBe("false"),
    );
  });
});
