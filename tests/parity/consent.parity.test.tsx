import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConsentPage } from "@/features/consent/ConsentPage";
import type { ConsentSession } from "@/features/consent/SessionSummary";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { claims, type PendingUnit } from "./pending";
import { CONSENT_PENDING } from "./pending-consent";

/** F4 content-parity gate for P4 `/consent`. */

const SESSION: ConsentSession = {
  reference: "IQC-CONF-0026",
  agreementReference: "IQC-EMP-0042",
  issuedOn: "18 Jun 2025",
  firstName: "Vikram",
  module: "Equity Investing Simplified",
  date: "20 Jun 2025",
  startTime: "10:00 AM",
  duration: "3 hours",
  venue: "Society clubhouse",
  cityState: "Mumbai, Maharashtra",
  audience: "Group",
  participants: "18",
  spoc: "Rohan Mehta",
  grossPayout: "₹12,000",
};

function report(label: string, items: readonly string[]): string {
  return [`${label} (${items.length}):`, ...items.map((text) => `  · ${text}`)].join("\n");
}

describe("content parity — P4 `/consent` against iqcommune-session-consent.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-session-consent.html"));
  const { container } = render(<ConsentPage session={SESSION} />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = CONSENT_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = CONSENT_PENDING.filter((unit) => !claimed.has(unit));

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
