import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PhotosPanel } from "./PhotosPanel";
import type { PhotoRow } from "@/services/console";

/**
 * The tab is built around completed sessions, so a row that is not one needs to
 * say why it is here — otherwise photos that arrived early read as an
 * unexplained extra row, and nobody knows the session still needs marking.
 */

vi.mock("../actions", () => ({ deletePhotoSubmission: vi.fn() }));

const row = (overrides: Partial<PhotoRow>): PhotoRow => ({
  id: "sess-7",
  submissionId: "sub-1",
  practitioner: "Vikram Varma",
  practitionerReference: "IQC-EMP-0005",
  sessionReference: "IQC-S0007",
  sessionStatus: "Completed",
  module: "Foundations of Personal Finance",
  city: "Hyderabad",
  sessionDate: "26 Aug 2026",
  photoCount: 2,
  uploadedOn: "16 Aug 2026",
  expiresOn: "15 Sept 2026",
  daysLeft: 30,
  ...overrides,
});

/** The note itself — not "Session photos" or "Session ref." around it. */
const NOTE = /^Session (Completed|Confirmed|Pending|Cancelled)$/;

const show = (rows: PhotoRow[]) => render(<PhotosPanel rows={rows} role="admin" />);

describe("photos that arrived outside the completed flow", () => {
  it("names the status the session is actually in", () => {
    show([row({ sessionStatus: "Confirmed" })]);
    expect(screen.getByText("Session Confirmed")).toBeInTheDocument();
  });

  it("says so when no session is linked", () => {
    show([row({ sessionReference: "—", sessionStatus: null })]);
    expect(screen.getByText("No session linked")).toBeInTheDocument();
  });

  it("stays quiet on the ordinary case", () => {
    // Every completed session would otherwise carry a redundant note.
    show([row({})]);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("stays quiet on a session that is merely awaiting photos", () => {
    // No photos yet, so there is nothing unexplained about the row.
    show([row({ submissionId: null, photoCount: 0, daysLeft: null, sessionStatus: "Completed" })]);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("still counts only un-uploaded sessions as not yet uploaded", () => {
    // The early arrivals are uploaded — they must not inflate the chase queue.
    show([row({ sessionStatus: "Confirmed" }), row({ id: "sess-3", submissionId: null, daysLeft: null })]);
    const pending = screen.getByRole("button", { name: /Not yet uploaded/ });
    expect(pending).toHaveTextContent("1");
  });
});
