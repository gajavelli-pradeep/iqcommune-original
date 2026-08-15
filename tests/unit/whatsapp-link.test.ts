import { describe, expect, it } from "vitest";

import { waLink, waNumber } from "@/lib/whatsapp/link";

/**
 * The number a `wa.me` link is built from.
 *
 * Worth testing because every failure here looks identical from the admin's
 * side: they press the button, WhatsApp opens on nothing or on the wrong
 * person, and there is no error to read. What the apply form collects is
 * whatever the applicant typed — a bare ten digits far more often than a
 * properly formatted international number.
 */
describe("the number behind the link", () => {
  it("gives a bare Indian mobile the country code it always assumed", () => {
    expect(waNumber("9876543210")).toBe("919876543210");
  });

  it("strips whatever punctuation someone typed", () => {
    // All four are the same number, and only one of them is what a form yields.
    expect(waNumber("98765 43210")).toBe("919876543210");
    expect(waNumber("98765-43210")).toBe("919876543210");
    expect(waNumber("+91 98765 43210")).toBe("919876543210");
    expect(waNumber("(+91) 98765-43210")).toBe("919876543210");
  });

  it("drops a trunk zero rather than dialling nowhere", () => {
    // wa.me reads a leading zero as part of the country code and reaches nobody.
    expect(waNumber("09876543210")).toBe("9876543210");
  });

  it("refuses anything too short to be a mobile", () => {
    // A landline fragment or a typo. Better no button than a wrong recipient,
    // which an admin only discovers when the wrong person replies.
    expect(waNumber("12345")).toBeNull();
    expect(waNumber("")).toBeNull();
    expect(waNumber("   ")).toBeNull();
    expect(waNumber(null)).toBeNull();
    expect(waNumber(undefined)).toBeNull();
    expect(waNumber("not a number")).toBeNull();
  });

  it("keeps a number that already carries a country code", () => {
    expect(waNumber("447700900123")).toBe("447700900123");
  });
});

describe("the link itself", () => {
  it("carries the message, encoded", () => {
    const link = waLink("9876543210", "Hi Priya, your session is confirmed.");
    expect(link).toBe(
      "https://wa.me/919876543210?text=Hi%20Priya%2C%20your%20session%20is%20confirmed.",
    );
  });

  it("survives the newlines and symbols the copy actually contains", () => {
    // The bodies are multi-line and carry — and ₹. Unencoded, everything after
    // the first break is lost.
    const link = waLink("9876543210", "Line one\n\nLine two — ₹12,000");
    expect(link).toContain("Line%20one%0A%0ALine%20two");
    expect(link).not.toContain("\n");
  });

  it("is null when there is no usable number", () => {
    // What the dialog reads to decide whether to offer the button at all.
    expect(waLink(null, "anything")).toBeNull();
    expect(waLink("12345", "anything")).toBeNull();
  });
});
