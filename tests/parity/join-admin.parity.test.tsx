import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JoinAdminPage } from "@/features/join-admin/JoinAdminPage";
import type { AdminInvite } from "@/features/join-admin/AccountSetupForm";

import { extractSpecEntries, readSpec, renderedHaystack } from "./extract";
import { claims, type PendingUnit } from "./pending";
import { JOIN_ADMIN_PENDING } from "./pending-join-admin";

/** F4 content-parity gate for P7 `/join-admin`. */

const INVITE: AdminInvite = {
  email: "sandhya.rao@iqcommune.com",
  role: "Admin",
};

function report(label: string, items: readonly string[]): string {
  return [`${label} (${items.length}):`, ...items.map((text) => `  · ${text}`)].join("\n");
}

describe("content parity — P7 `/join-admin` against iqcommune-user-setup.html", () => {
  const specStrings = extractSpecEntries(readSpec("iqcommune-user-setup.html"));
  const { container } = render(<JoinAdminPage invite={INVITE} token="test-token" />);
  const haystack = renderedHaystack(container);

  const missing = specStrings.filter((entry) => !haystack.includes(entry.text));
  const claimed = new Set<PendingUnit>();
  const undeclared = missing.filter(({ text, line }) => {
    const owner = JOIN_ADMIN_PENDING.find((unit) => claims(unit, text, line));
    if (owner) claimed.add(owner);
    return owner === undefined;
  });
  const stale = JOIN_ADMIN_PENDING.filter((unit) => !claimed.has(unit));

  it("extracts a plausible amount of copy from the spec", () => {
    expect(specStrings.length).toBeGreaterThan(10);
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
