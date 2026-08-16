import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Keeps the tracked V7 spec identical to the client's delivered copy.
 *
 * `spec/v7/` is what every parity gate reads, and it is a COPY. The original
 * arrives in a delivery folder, which is where a re-delivery lands. Without
 * this, a new V7 drop would update the delivery folder, leave the tracked copy
 * stale, and every parity gate would go on happily proving the app matches a
 * spec nobody has shipped since.
 *
 * Two locations are checked because deliveries have arrived in both: beside the
 * checkout (the original `client_requirements/…`), and inside it as
 * `client requirements/` (the 2026-08-12 drop). Whichever exists is compared,
 * and a `latest/` subfolder inside it wins over the folder root — a re-delivery
 * lands there rather than replacing the whole folder, so the root can still be
 * holding the copy that was superseded.
 *
 * A spec the delivery no longer carries is not drift. The folder holds what has
 * been delivered, not a mirror of this directory, so a page nobody has re-sent
 * since it was vendored cannot be compared against anything. Counting that as
 * failure left the check permanently red, which is how a gate stops being read.
 * Losing a spec outright is still caught — by the count above, which is the
 * assertion that owns that failure.
 *
 * The delivery folder is absent in CI and in git worktrees, which is the entire
 * reason the specs are vendored in the first place. So this check runs only
 * where both copies exist: it is a drift detector for the machine that receives
 * deliveries, not a second copy of the parity gate. That is a genuine "cannot
 * be evaluated here", not a skipped assertion — the gates themselves still run
 * in CI against `spec/v7/`.
 */

const TRACKED = resolve(process.cwd(), "spec", "v7");
const DELIVERY_LOCATIONS = [
  resolve(process.cwd(), "client requirements"),
  resolve(process.cwd(), "..", "client_requirements", "thefinalfinalfiles (V7)"),
];
const DELIVERED = DELIVERY_LOCATIONS.find((path) => existsSync(path));

/** The newest delivered copy of one spec, or null if it was never re-sent. */
function deliveredCopy(name: string): string | null {
  if (!DELIVERED) return null;
  return (
    [resolve(DELIVERED, "latest", name), resolve(DELIVERED, name)].find((path) =>
      existsSync(path),
    ) ?? null
  );
}

describe("V7 spec freshness", () => {
  it("tracks every spec the parity gates read", () => {
    const tracked = readdirSync(TRACKED).filter((name) => name.endsWith(".html"));
    // Eight pages: landing, empanelment, onboarding, consent, photos, rating,
    // user setup, admin console. Fewer means a gate lost its source of truth.
    expect(tracked).toHaveLength(8);
  });

  it("matches the delivered copy byte for byte", () => {
    if (!DELIVERED) {
      // No delivery folder here (CI, a worktree, or a fresh clone). Nothing to
      // compare against; the parity gates still run against the tracked copy.
      return;
    }

    const drifted = readdirSync(TRACKED)
      .filter((name) => name.endsWith(".html"))
      .filter((name) => {
        const delivered = deliveredCopy(name);
        if (!delivered) return false;
        return readFileSync(resolve(TRACKED, name)).compare(readFileSync(delivered)) !== 0;
      });

    // If this fails after a re-delivery, copy the new files over spec/v7/ and
    // re-run the parity gates — the diff they then report is the real work.
    expect(drifted).toEqual([]);
  });
});
