import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RatePage } from "@/features/rate/RatePage";
import type { RatedSession } from "@/features/rate/SessionDetailsCard";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { claims, type PendingUnit } from "./pending";
import { RATE_PENDING } from "./pending-rate";

/**
 * F4 content-parity gate for P3 `/rate`.
 *
 * The page is rendered with a fixed session rather than a live one: the copy is
 * what this gate checks, and the values in the detail rows are data, not copy.
 */

const SESSION: RatedSession = {
  practitioner: "Vikram Kulkarni",
  module: "Equity Investing Simplified",
  sessionDate: "20 Jun 2025",
  city: "Mumbai",
  reference: "IQC-S003",
  requestedBy: "Rohan Mehta",
};

function report(label: string, items: readonly string[]): string {
  return [`${label} (${items.length}):`, ...items.map((text) => `  · ${text}`)].join("\n");
}

describe("content parity — P3 `/rate` against iqcommune-practitioner-rating.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-practitioner-rating.html"));
  const { container } = render(<RatePage session={SESSION} />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = RATE_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = RATE_PENDING.filter((unit) => !claimed.has(unit));

  it("extracts a plausible amount of copy from the spec", () => {
    expect(specStrings.length).toBeGreaterThan(20);
  });

  it("renders every V7 string whose section has been built", () => {
    expect(
      undeclared.map((entry) => entry.text),
      report("V7 copy missing and undeclared", undeclared.map((entry) => entry.text)),
    ).toEqual([]);
  });

  it("has no stale pending declarations", () => {
    const names = stale.map((unit) => `${unit.unit} — ${unit.reason}`);
    expect(names, report("Pending units matching nothing missing", names)).toEqual([]);
  });
});
