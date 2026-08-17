/**
 * How many photos "Sessions in the room" carries on the landing page.
 *
 * In `constants/` rather than beside the gallery reads, because both sides need
 * it: the publish action enforces it server-side, and the console panel shows
 * "N / 20" and marks which photo is next to be evicted. `services/console.ts`
 * is `server-only`, so importing the value from there into the client panel
 * pulls a server module into the browser bundle and the page 500s — a type-only
 * import is erased, a value import is not.
 *
 * Publishing past this evicts the oldest, so the number is a real product
 * decision and not a rendering detail.
 */
export const GALLERY_LIMIT = 20;

/**
 * How long a draft photo's city or caption may run, in characters (client,
 * 2026-08-17).
 *
 * Both fields are short labels on a landing-page tile, not a place for prose —
 * the caption placeholder itself is an example of the length this is meant to
 * hold ("Group discussion, Q&A round", 29 characters). Shared by the console
 * panel (as `maxLength`, so it cannot be typed past) and `updateGalleryPhoto`
 * (as a clamp, so a request that bypassed the input still cannot persist past
 * it) — one number rather than the same limit stated twice.
 */
export const GALLERY_FIELD_MAX = 50;
