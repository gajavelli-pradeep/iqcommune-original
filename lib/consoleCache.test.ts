// jsdom has no real IndexedDB; polyfilled here only (not tests/setup.ts) so it
// doesn't leak into unrelated tests.
import "fake-indexeddb/auto";

import { describe, expect, it } from "vitest";

import { __internal, loadTab, saveTab } from "./consoleCache";

interface DemoRow {
  id: string;
  name: string;
  email: string;
}

const ROWS: DemoRow[] = [{ id: "p1", name: "Priya Sharma", email: "priya@example.com" }];

describe("consoleCache", () => {
  it("round-trips the exact saved rows", async () => {
    await saveTab("practitioners", ROWS);

    const result = await loadTab<DemoRow[]>("practitioners");

    expect(result?.rows).toEqual(ROWS);
    expect(typeof result?.savedAt).toBe("number");
  });

  it("returns null for a tab that was never saved", async () => {
    const result = await loadTab("never-saved-tab");
    expect(result).toBeNull();
  });

  it("does not store the plain JSON — the raw value is obfuscated", async () => {
    await saveTab("agreements", ROWS);

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(__internal.DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error as Error);
    });

    const raw = await new Promise<{ blob: string; savedAt: number }>((resolve, reject) => {
      const tx = db.transaction(__internal.STORE_NAME, "readonly");
      const request = tx.objectStore(__internal.STORE_NAME).get("agreements");
      request.onsuccess = () => resolve(request.result as { blob: string; savedAt: number });
      request.onerror = () => reject(request.error as Error);
    });
    db.close();

    expect(raw.blob).not.toContain("Priya Sharma");
    expect(raw.blob).not.toContain("priya@example.com");
    // Sanity: the round-trip above still works, so the obfuscation is
    // reversible, not just different.
    expect(await loadTab<DemoRow[]>("agreements")).toEqual({ rows: ROWS, savedAt: raw.savedAt });
  });
});
