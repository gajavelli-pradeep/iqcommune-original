/**
 * Client-side cache of the last successfully loaded rows per console tab.
 *
 * When a panel's live read fails, `CachedPanel` falls back to whatever was
 * cached here instead of a bare error box — see PLAN-console-resilience.md.
 *
 * IndexedDB rather than localStorage: a tab's rows can be large (a whole
 * table), and localStorage's synchronous API plus ~5MB ceiling make it a poor
 * fit for that; IndexedDB is async and has no practical size limit here.
 *
 * Every call guards for the absence of `indexedDB` (SSR, older browsers,
 * private-mode restrictions) and never throws to the caller — a cache miss
 * and a cache error look identical to `loadTab`: both resolve `null`.
 */

const DB_NAME = "iq_c9e";
const STORE_NAME = "d";
const DB_VERSION = 1;

// Obfuscation only — deters someone casually opening DevTools -> Application
// -> IndexedDB and reading a name/email straight off the stored value. This
// is NOT encryption and is not a security boundary.
const XOR_KEY = 0x5a;

function pack(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value)).map((b) => b ^ XOR_KEY);
  return btoa(String.fromCharCode(...bytes));
}

function unpack<T>(blob: string): T {
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0)).map((b) => b ^ XOR_KEY);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

interface StoredEntry {
  blob: string;
  savedAt: number;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Resolves `null` instead of rejecting on any open failure. */
function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

/** Saves `rows` for `tabId`, overwriting whatever was cached before it. No-ops
 *  (resolves) if IndexedDB is unavailable or the write fails for any reason —
 *  caching is a nice-to-have, never something a caller needs to handle. */
export async function saveTab(tabId: string, rows: unknown): Promise<void> {
  const db = await openDb();
  if (!db) return;

  try {
    await new Promise<void>((resolve) => {
      const entry: StoredEntry = { blob: pack(rows), savedAt: Date.now() };
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry, tabId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } finally {
    db.close();
  }
}

/** Returns the last cached rows for `tabId`, or `null` if nothing was ever
 *  saved, or on any read error — a caller never needs to distinguish "no
 *  cache" from "cache broke". */
export async function loadTab<T>(tabId: string): Promise<{ rows: T; savedAt: number } | null> {
  const db = await openDb();
  if (!db) return null;

  try {
    return await new Promise<{ rows: T; savedAt: number } | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(tabId);
      request.onsuccess = () => {
        const entry = request.result as StoredEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }
        try {
          resolve({ rows: unpack<T>(entry.blob), savedAt: entry.savedAt });
        } catch {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

/** Exposed only so `consoleCache.test.ts` can open the same store directly
 *  and assert the raw stored value isn't plain JSON. Not part of the public
 *  cache API — nothing outside the test should import this. */
export const __internal = { DB_NAME, STORE_NAME };
