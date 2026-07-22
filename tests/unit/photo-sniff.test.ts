// @vitest-environment node
//
// Server-only code: it reads File bytes via slice().arrayBuffer(), which the
// route runs on Node (undici File). jsdom's Blob polyfill lacks arrayBuffer on a
// slice, so this test uses the same runtime the code actually runs in.
import { describe, expect, it } from "vitest";

import { sniffImageType } from "@/services/photo-submissions";

/**
 * The magic-byte sniff (audit M1) is the control that stops a polyglot from
 * being stored as an image. It must trust the bytes, not the client-declared
 * `file.type`. These tests exercise exactly that: a payload's declared type is
 * irrelevant; only its leading bytes decide.
 */

function fileOf(bytes: number[], declaredType: string): File {
  return new File([new Uint8Array(bytes)], "upload", { type: declaredType });
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];

describe("sniffImageType", () => {
  it("accepts a real PNG regardless of declared type", async () => {
    expect(await sniffImageType(fileOf(PNG, "image/png"))).toBe("image/png");
    // Even mislabelled, real PNG bytes are still a PNG.
    expect(await sniffImageType(fileOf(PNG, "image/jpeg"))).toBe("image/png");
  });

  it("accepts a real JPEG regardless of declared type", async () => {
    expect(await sniffImageType(fileOf(JPEG, "image/jpeg"))).toBe("image/jpeg");
    expect(await sniffImageType(fileOf(JPEG, "image/png"))).toBe("image/jpeg");
  });

  it("rejects a polyglot: HTML bytes labelled image/png", async () => {
    const html = [...Buffer.from("<html><script>alert(1)</script>")];
    expect(await sniffImageType(fileOf(html, "image/png"))).toBeNull();
  });

  it("rejects an SVG labelled image/png", async () => {
    const svg = [...Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>")];
    expect(await sniffImageType(fileOf(svg, "image/png"))).toBeNull();
  });

  it("rejects an empty file", async () => {
    expect(await sniffImageType(fileOf([], "image/png"))).toBeNull();
  });

  it("rejects a truncated PNG signature", async () => {
    expect(await sniffImageType(fileOf([0x89, 0x50, 0x4e], "image/png"))).toBeNull();
  });
});
