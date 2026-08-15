import { inflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { renderConfirmation } from "@/lib/pdf/confirmation";

/**
 * The confirmation document's own words.
 *
 * Nothing else covers this file, and it is the one a practitioner is asked to
 * consent to — its copy is the terms, not chrome. The payment line in
 * particular has now been wrong twice in two different ways: absent when the
 * agreement required it, then a date computed from the session when the clock
 * actually starts at invoice receipt.
 */

/** The writer emits hex strings, so the bytes have to be read back to assert. */
function textOf(pdf: Uint8Array): string {
  const raw = Buffer.from(pdf).toString("latin1");
  let out = "";
  for (const [, body] of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    let content: string;
    try {
      content = inflateSync(Buffer.from(body, "latin1")).toString("latin1");
    } catch {
      continue;
    }
    for (const [, hex] of content.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      out += `${Buffer.from(hex.replace(/\s/g, ""), "hex").toString("latin1")}\n`;
    }
  }
  return out;
}

const session = {
  confirmationReference: "IQC-CONF-0007",
  sessionReference: "IQC-S0006",
  practitioner: "Vikram Varma",
  module: "Equity Investing Simplified",
  sessionDate: "19 Aug 2026",
  startTime: "10:00",
  durationMinutes: 180,
  city: "Pune",
  state: "Maharashtra",
  venue: "Kotak Securities",
  participants: "5-8",
  spoc: "Rohan Varma",
  audience: "Group (register as SPOC)",
  grossPayout: "INR 50,000",
  consentGivenAt: "15 Aug 2026, 6:17:05 pm IST",
};

describe("the confirmation document", () => {
  it("states the payment turnaround, not a date", async () => {
    // A date here would name a day nobody can know: the clock starts when the
    // invoice arrives, and the platform never sees the invoice.
    const text = textOf(await renderConfirmation(session));

    expect(text).toContain("Payment TAT");
    expect(text).toContain("+7 working days from invoice receipt");
    expect(text).not.toContain("Expected payment");
  });

  it("carries the terms the practitioner is consenting to", async () => {
    const text = textOf(await renderConfirmation(session));

    for (const value of [
      "IQC-CONF-0007",
      "IQC-S0006",
      "Vikram Varma",
      "Equity Investing Simplified",
      "19 Aug 2026",
      "INR 50,000",
    ]) {
      expect(text, value).toContain(value);
    }
  });
});
