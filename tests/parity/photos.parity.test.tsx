import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhotosPage } from "@/features/photos/PhotosPage";
import type { PhotoSession } from "@/features/photos/PhotoSubmissionForm";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { claims, type PendingUnit } from "./pending";
import { PHOTOS_PENDING } from "./pending-photos";

/** F4 content-parity gate for P5 `/submit-photos`. */

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

function report(label: string, items: readonly string[]): string {
  return [`${label} (${items.length}):`, ...items.map((text) => `  · ${text}`)].join("\n");
}

describe("content parity — P5 `/submit-photos` against iqcommune-postsession-photos.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-postsession-photos.html"));
  const { container } = render(<PhotosPage session={SESSION} />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = PHOTOS_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = PHOTOS_PENDING.filter((unit) => !claimed.has(unit));

  it("extracts a plausible amount of copy from the spec", () => {
    expect(specStrings.length).toBeGreaterThan(20);
  });

  it("renders every V7 string whose section has been built", () => {
    const texts = undeclared.map((entry) => entry.text);
    expect(texts, report("V7 copy missing and undeclared", texts)).toEqual([]);
  });

  it("has no stale pending declarations", () => {
    const names = stale.map((unit) => `${unit.unit} — ${unit.reason}`);
    expect(names, report("Pending units matching nothing missing", names)).toEqual([]);
  });
});
