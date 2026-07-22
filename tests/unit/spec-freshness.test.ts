import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Keeps the tracked V7 spec identical to the client's delivered copy.
 *
 * `spec/v7/` is what every parity gate reads, and it is a COPY. The original
 * arrives as a folder beside the checkout (`client_requirements/…`), which is
 * where a re-delivery lands. Without this, a new V7 drop would update the
 * delivery folder, leave the tracked copy stale, and every parity gate would go
 * on happily proving the app matches a spec nobody has shipped since.
 *
 * The delivery folder is absent in CI, which is the entire reason the specs are
 * vendored in the first place. So this check runs only where both copies exist:
 * it is a drift detector for the machine that receives deliveries, not a second
 * copy of the parity gate. That is a genuine "cannot be evaluated here", not a
 * skipped assertion — the gates themselves still run in CI against `spec/v7/`.
 */

const TRACKED = resolve(process.cwd(), "spec", "v7");
const DELIVERED = resolve(process.cwd(), "..", "client_requirements", "thefinalfinalfiles (V7)");

describe("V7 spec freshness", () => {
  it("tracks every spec the parity gates read", () => {
    const tracked = readdirSync(TRACKED).filter((name) => name.endsWith(".html"));
    // Eight pages: landing, empanelment, onboarding, consent, photos, rating,
    // user setup, admin console. Fewer means a gate lost its source of truth.
    expect(tracked).toHaveLength(8);
  });

  it("matches the delivered copy byte for byte", () => {
    if (!existsSync(DELIVERED)) {
      // No delivery folder here (CI, or a fresh clone). Nothing to compare
      // against; the parity gates still run against the tracked copy.
      return;
    }

    const drifted = readdirSync(TRACKED)
      .filter((name) => name.endsWith(".html"))
      .filter((name) => {
        const delivered = resolve(DELIVERED, name);
        if (!existsSync(delivered)) return true;
        return readFileSync(resolve(TRACKED, name)).compare(readFileSync(delivered)) !== 0;
      });

    // If this fails after a re-delivery, copy the new files over spec/v7/ and
    // re-run the parity gates — the diff they then report is the real work.
    expect(drifted).toEqual([]);
  });
});
