import { beforeEach, describe, expect, it, vi } from "vitest";

import { GALLERY_FIELD_MAX } from "@/constants/gallery";

/**
 * `updateGalleryPhoto` is the real trust boundary for a draft photo's city and
 * caption — the panel's `maxLength` only stops what is typed by hand, and a
 * request built directly against this action skips that entirely. Proven here
 * as a clamp, not a rejection: the admin already has the mutate capability this
 * action requires, so an over-length value is a mistake to correct rather than
 * an attack to refuse.
 */

/** What `.update(...)` was called with — the whole point of the stub. */
let written: Record<string, unknown> | null = null;

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(async () => ({ role: "global_admin", email: "admin@iqcommune.com" })),
  recordActivity: vi.fn(async () => undefined),
}));

vi.mock("./requireRole", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/services/console", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/console")>()),
  recordActivity: mocks.recordActivity,
}));
// The route this test targets calls it twice per save; a real implementation
// outside a request context throws, so it is stubbed rather than exercised.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = {
      from: () => builder,
      update(patch: Record<string, unknown>) {
        written = patch;
        return builder;
      },
      eq: () => builder,
      is: async () => ({ error: null }),
    };
    return builder;
  },
}));

const { updateGalleryPhoto } = await import("./actions");

describe("a draft photo's city and caption are capped where they are actually written", () => {
  beforeEach(() => {
    written = null;
  });

  it("clamps a city longer than the limit rather than rejecting it", async () => {
    const overlong = "x".repeat(GALLERY_FIELD_MAX + 20);
    await updateGalleryPhoto("photo-1", { city: overlong });

    expect(written!.city).toBe("x".repeat(GALLERY_FIELD_MAX));
    expect((written!.city as string).length).toBe(GALLERY_FIELD_MAX);
  });

  it("clamps an overlong caption the same way", async () => {
    const overlong = "Group discussion, Q&A round, followed by a long open networking session";
    expect(overlong.length).toBeGreaterThan(GALLERY_FIELD_MAX);

    await updateGalleryPhoto("photo-1", { caption: overlong });

    expect(written!.caption).toBe(overlong.slice(0, GALLERY_FIELD_MAX));
    expect((written!.caption as string).length).toBe(GALLERY_FIELD_MAX);
  });

  it("leaves a value inside the limit untouched", async () => {
    await updateGalleryPhoto("photo-1", { city: "Bengaluru" });
    expect(written!.city).toBe("Bengaluru");
  });

  it("still turns whitespace-only input into null, not an empty clamp", async () => {
    await updateGalleryPhoto("photo-1", { caption: "   " });
    expect(written!.caption).toBeNull();
  });
});
