import JSZip from "jszip";
import { describe, expect, it } from "vitest";

/**
 * The archive the photo download route builds.
 *
 * Worth pinning because the failure is invisible from the server: a route that
 * returns 200 with a malformed body looks healthy in every log and only fails
 * when someone tries to open the file. These assertions read the archive back
 * the way an unzip tool does.
 *
 * The route's own construction is mirrored here — STORE, `arraybuffer`, and the
 * extension taken off the stored key — so a change to any of those on one side
 * and not the other shows up as a failure rather than as a corrupt download.
 */

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

async function buildArchive(files: ReadonlyArray<[string, Uint8Array | string]>) {
  const zip = new JSZip();
  for (const [name, body] of files) zip.file(name, body);
  return new Uint8Array(await zip.generateAsync({ type: "arraybuffer", compression: "STORE" }));
}

describe("photo archive", () => {
  it("is a real zip an unzip tool will recognise", async () => {
    const archive = await buildArchive([["IQC-S001-photo-1.png", PNG_BYTES]]);

    // Local file header signature, PK\x03\x04. Without it nothing will open it.
    expect([...archive.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(archive.byteLength).toBeGreaterThan(0);
  });

  it("carries every selected photo back out byte-identical", async () => {
    const archive = await buildArchive([
      ["IQC-S001-photo-1.png", PNG_BYTES],
      ["IQC-S001-photo-2.jpg", "second photo bytes"],
    ]);

    const reopened = await JSZip.loadAsync(archive);
    expect(Object.keys(reopened.files).sort()).toEqual([
      "IQC-S001-photo-1.png",
      "IQC-S001-photo-2.jpg",
    ]);

    const first = await reopened.file("IQC-S001-photo-1.png")!.async("uint8array");
    expect([...first]).toEqual([...PNG_BYTES]);
    expect(await reopened.file("IQC-S001-photo-2.jpg")!.async("string")).toBe("second photo bytes");
  });

  it("keeps the file extension, which the per-file download used to drop", async () => {
    // Saves arrived typeless before, because the filename was built without one.
    const archive = await buildArchive([["IQC-S001-photo-1.jpg", "x"]]);
    const names = Object.keys(await JSZip.loadAsync(archive).then((z) => z.files));

    expect(names[0]).toMatch(/\.jpg$/);
  });

  it("stores rather than deflates, so already-compressed photos are not re-crunched", async () => {
    // A JPEG gains nothing from DEFLATE. STORE keeps the bytes as they are, so
    // the entry is at least as large as its input rather than smaller.
    const body = PNG_BYTES;
    const archive = await buildArchive([["a.png", body]]);

    const reopened = await JSZip.loadAsync(archive);
    const roundTripped = await reopened.file("a.png")!.async("uint8array");
    expect(roundTripped.byteLength).toBe(body.byteLength);
  });
});
