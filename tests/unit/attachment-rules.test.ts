import { describe, expect, it } from "vitest";

import { canDeleteAttachment, sniffType, unattachedMentions } from "@/lib/email/attachment-rules";

describe("canDeleteAttachment", () => {
  it("lets a global admin delete anything, including seeded files", () => {
    expect(canDeleteAttachment("global_admin", null, "g@x.com")).toBe(true);
    expect(canDeleteAttachment("global_admin", "a@x.com", "g@x.com")).toBe(true);
  });
  it("lets an admin delete only their own upload (case-insensitive)", () => {
    expect(canDeleteAttachment("admin", "A@x.com", "a@X.com")).toBe(true);
    expect(canDeleteAttachment("admin", "b@x.com", "a@x.com")).toBe(false);
  });
  it("never lets an admin delete a seeded file", () => {
    expect(canDeleteAttachment("admin", null, "a@x.com")).toBe(false);
  });
});

describe("sniffType", () => {
  it("reads the type from the bytes, not the name", () => {
    expect(sniffType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});

describe("unattachedMentions", () => {
  const files = [
    { id: "a", label: "Session Standee", mention: "Session Standee" },
    { id: "b", label: "Dos & Don'ts", mention: "Dos & Don'ts" },
  ];
  const body = "Attached: Dos and Don'ts and the Session Standee.";
  it("warns about a mentioned file that was removed", () => {
    expect(unattachedMentions(body, files, ["b"]).map((f) => f.id)).toEqual(["a"]);
  });
  it("is quiet when everything mentioned is attached, or nothing is mentioned", () => {
    expect(unattachedMentions(body, files, ["a", "b"])).toEqual([]);
    expect(unattachedMentions("Hello", files, [])).toEqual([]);
  });
});
