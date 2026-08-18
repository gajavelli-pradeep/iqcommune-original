import { describe, expect, it } from "vitest";

import { CITIES, CITY_STATE, INDIAN_STATES, STATE_CITIES, TIER_1_CITIES, TIER_2_CITIES } from "@/constants/india";

/**
 * `CITY_STATE`/`STATE_CITIES` back the form's autofill (client, 2026-08-18) —
 * every city needs a real, correctly-spelled state, or the field it narrows
 * either shows nothing or silently offers the wrong answer. Hand-entered data
 * for 104 cities is exactly where a typo hides; these exist to catch one.
 */

describe("city/state data", () => {
  it("gives every listed city a state that is actually on the states list", () => {
    for (const city of CITIES) {
      const state = CITY_STATE[city];
      expect(state, `${city} has no state`).toBeTruthy();
      expect(INDIAN_STATES as readonly string[], `${city} → "${state}" is not a real state`).toContain(state);
    }
  });

  it("has no duplicate city name across the two tiers", () => {
    // Object.fromEntries silently keeps the last of a repeated key — a
    // duplicate here would not fail loudly, just quietly lose one city's row.
    const seen = new Set<string>();
    const dupes = CITIES.filter((city) => (seen.has(city) ? true : (seen.add(city), false)));
    expect(dupes).toEqual([]);
  });

  it("reverses CITY_STATE exactly — every city under its own state, nowhere else", () => {
    for (const city of CITIES) {
      const state = CITY_STATE[city];
      expect(STATE_CITIES[state], `${state} is missing from STATE_CITIES`).toContain(city);
    }
    const total = Object.values(STATE_CITIES).reduce((sum, cities) => sum + cities.length, 0);
    expect(total).toBe(CITIES.length);
  });

  it("places the eight metros and their states correctly", () => {
    expect(CITY_STATE.Bengaluru).toBe("Karnataka");
    expect(CITY_STATE["Delhi NCR"]).toBe("Delhi");
    expect(CITY_STATE.Mumbai).toBe("Maharashtra");
    expect(CITY_STATE.Hyderabad).toBe("Telangana");
    expect(CITY_STATE.Chennai).toBe("Tamil Nadu");
    expect(CITY_STATE.Pune).toBe("Maharashtra");
    expect(CITY_STATE.Kolkata).toBe("West Bengal");
    expect(CITY_STATE.Ahmedabad).toBe("Gujarat");
  });

  it("keeps Delhi NCR's satellite towns as their own tier-2 entries", () => {
    // The client's list folds Noida/Gurgaon/Faridabad into "Delhi NCR"; ours
    // keeps them separate so a search for one of those names still finds it.
    expect(TIER_2_CITIES).toContain("Noida");
    expect(TIER_2_CITIES).toContain("Gurugram");
    expect(TIER_2_CITIES).toContain("Faridabad");
  });

  it("keeps CITIES as tier 1 followed by tier 2, with no overlap", () => {
    expect(CITIES).toEqual([...TIER_1_CITIES, ...TIER_2_CITIES]);
    expect(new Set(TIER_1_CITIES).size + new Set(TIER_2_CITIES).size).toBe(CITIES.length);
  });
});
