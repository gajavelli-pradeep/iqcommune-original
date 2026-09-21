import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ deleteEmailAttachment: vi.fn() }));

const { AttachmentPanel } = await import("./AttachmentPanel");

const FLYER = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "Session Standee",
  mention: "Session Standee",
  contentType: "image/png",
  sizeBytes: 120_000,
  kind: "library" as const,
  isDefault: true,
  previewUrl: "/api/email-attachments/11111111-1111-4111-8111-111111111111",
  canDelete: true,
};

function open() {
  render(
    <AttachmentPanel
      files={[FLYER]}
      attachedIds={[FLYER.id]}
      onAttachedChange={() => {}}
      onFilesChange={() => {}}
      refresh={async () => [FLYER]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview Session Standee" }));
}

describe("image preview", () => {
  it("shows the picture fitted, with padding, and zooms in and out", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("Fit", { selector: "span" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("150%")).toBeTruthy();
    expect(screen.getByAltText("Session Standee").style.width).toBe("150%");

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("zooms from the keyboard and resets with 0", () => {
    open();
    fireEvent.keyDown(window, { key: "+" });
    fireEvent.keyDown(window, { key: "+" });
    expect(screen.getByText("150%")).toBeTruthy();
    fireEvent.keyDown(window, { key: "0" });
    expect(screen.getByText("Fit", { selector: "span" })).toBeTruthy();
  });

  it("double-click toggles between fit and 200%", () => {
    open();
    const image = screen.getByAltText("Session Standee");
    fireEvent.doubleClick(image);
    expect(screen.getByText("200%")).toBeTruthy();
    fireEvent.doubleClick(screen.getByAltText("Session Standee"));
    expect(screen.getByText("Fit", { selector: "span" })).toBeTruthy();
  });
});
