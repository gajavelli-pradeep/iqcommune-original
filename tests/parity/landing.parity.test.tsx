import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

import { extractSpecStrings, readSpec, renderedHaystack } from "./extract";
import { LANDING_PENDING, type PendingUnit } from "./pending";

/**
 * F4 content-parity gate for P1 `/`.
 *
 * ADR 0001 records that V6's rebuild shipped with 100 non-matching controls,
 * found only after release, and that drift must be measured rather than
 * trusted. This is the measurement.
 *
 * `PARITY_REPORT=1 pnpm test` lists every missing string instead of the first 40.
 */

const LIST_LIMIT = process.env.PARITY_REPORT === "1" ? Number.POSITIVE_INFINITY : 40;

function report(label: string, items: readonly string[]): string {
  const shown = items.slice(0, LIST_LIMIT).map((text) => `  · ${text}`);
  const rest = items.length - shown.length;
  return [`${label} (${items.length}):`, ...shown, rest > 0 ? `  … ${rest} more` : ""]
    .filter(Boolean)
    .join("\n");
}

describe("content parity — P1 `/` against iqcommune-main-landing-page.html", () => {
  const specStrings = extractSpecStrings(readSpec("iqcommune-main-landing-page.html"));
  const { container } = render(<HomePage />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((text) => !haystack.includes(text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter((text) => {
    const owner = LANDING_PENDING.find((unit) => unit.matches(text));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = LANDING_PENDING.filter((unit) => !claimed.has(unit));

  it("extracts a plausible amount of copy from the spec", () => {
    // Guards the gate itself: an extractor that silently returned nothing would
    // make every parity assertion below pass trivially.
    expect(specStrings.length).toBeGreaterThan(200);
  });

  it("renders every V7 string whose section has been built", () => {
    expect(undeclared, report("V7 copy missing and undeclared", undeclared)).toEqual([]);
  });

  it("has no stale pending declarations", () => {
    const names = stale.map((unit) => `${unit.unit} — ${unit.reason}`);
    expect(
      names,
      report("Pending units that no longer match anything missing — delete them", names),
    ).toEqual([]);
  });
});
