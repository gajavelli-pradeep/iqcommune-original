import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import type { OnboardingPractitioner } from "@/features/onboarding/OnboardingForm";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { claims, type PendingUnit } from "./pending";
import { ONBOARDING_PENDING } from "./pending-onboarding";

/** F4 content-parity gate for P6 `/onboarding`. */

const PRACTITIONER: OnboardingPractitioner = {
  name: "Vikram Kulkarni",
  role: "Equity Analyst",
  organisation: "Kotak Securities",
  city: "Mumbai",
  email: "vikram@example.com",
  agreementReference: "IQC-EMP-0042",
};

function report(label: string, items: readonly string[]): string {
  return [`${label} (${items.length}):`, ...items.map((text) => `  · ${text}`)].join("\n");
}

describe("content parity — P6 `/onboarding` against iqcommune-onboarding.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-onboarding.html"));
  const { container } = render(<OnboardingPage practitioner={PRACTITIONER} token="test-token" />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = ONBOARDING_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = ONBOARDING_PENDING.filter((unit) => !claimed.has(unit));

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
