import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplyModal } from "@/features/practitioners/ApplyModalBody";
import { PractitionerSections } from "@/features/practitioners/PractitionerSections";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { PRACTITIONERS_PENDING } from "./pending-practitioners";
import { claims, type PendingUnit } from "./pending";

/**
 * F4 content-parity gate for P2 `/practitioners`.
 *
 * Same contract as the landing page's: every visible V7 string must render, and
 * anything missing must be declared against the unit that will deliver it. The
 * page is mid-clone, so the declared list is long — it only ever shrinks.
 */

const LIST_LIMIT = process.env.PARITY_REPORT === "1" ? Number.POSITIVE_INFINITY : 40;

function report(label: string, items: readonly string[]): string {
  const shown = items.slice(0, LIST_LIMIT).map((text) => `  · ${text}`);
  const rest = items.length - shown.length;
  return [`${label} (${items.length}):`, ...shown, rest > 0 ? `  … ${rest} more` : ""]
    .filter(Boolean)
    .join("\n");
}

describe("content parity — P2 `/practitioners` against iqcommune-empanelment.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-empanelment.html"));
  const { container } = render(<PractitionerSections />);
  // The application form only exists once its dialog is open, so the gate opens
  // it rather than declaring the whole form "pending" — it has shipped.
  const dialog = render(<ApplyModal open onClose={() => {}} />);
  // `baseElement`, not `container`: `Modal` portals to `document.body` so it can
  // paint above the sticky header, which puts its copy outside the render
  // container entirely. Reading `container` here silently found nothing.
  const haystack = `${renderedHaystack(container)} ${renderedHaystack(dialog.baseElement)}`;

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = PRACTITIONERS_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = PRACTITIONERS_PENDING.filter((unit) => !claimed.has(unit));

  it("extracts a plausible amount of copy from the spec", () => {
    expect(specStrings.length).toBeGreaterThan(150);
  });

  it("renders every V7 string whose section has been built", () => {
    expect(undeclared.map((e) => e.text), report("V7 copy missing and undeclared", undeclared.map((e) => e.text))).toEqual([]);
  });

  it("has no stale pending declarations", () => {
    const names = stale.map((unit) => `${unit.unit} — ${unit.reason}`);
    expect(names, report("Pending units that match nothing missing — delete them", names)).toEqual(
      [],
    );
  });
});
