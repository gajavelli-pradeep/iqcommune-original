import { describe, expect, it } from "vitest";

import { readSpec } from "../parity/extract";
import { extractScriptStrings } from "../parity/script-copy";

/**
 * Guards the guard. An extractor that silently returned nothing would make
 * every console parity assertion pass trivially — the exact failure this whole
 * gate exists to prevent.
 */
describe("script copy extraction", () => {
  const strings = extractScriptStrings(readSpec("iqcommune-admin-console-automated.html"));

  it("finds a substantial amount of copy the DOM extractor cannot see", () => {
    expect(strings.length).toBeGreaterThan(200);
  });

  it("finds seed data, dictionary labels and markup copy", () => {
    const texts = strings.map((entry) => entry.text);
    expect(texts).toContain("Priya Sharma");
    expect(texts).toContain("Screening done");
    expect(texts).toContain("Pipeline progress");
  });

  it("tags toasts separately, since a render can never show them", () => {
    const toasts = strings.filter((entry) => entry.kind === "toast");
    expect(toasts.length).toBeGreaterThan(20);
  });

  it("rejects identifiers, selectors and storage keys", () => {
    const texts = strings.map((entry) => entry.text);
    expect(texts).not.toContain("s-empanelled");
    expect(texts).not.toContain("iqcommune_agreement_submissions");
    expect(texts).not.toContain("send-agreement");
  });
});
