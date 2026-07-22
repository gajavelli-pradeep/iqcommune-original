import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/** Unmount between tests so a leaked DOM never makes the next test pass. */
afterEach(cleanup);

/**
 * jsdom implements no layout, so it ships no `scrollIntoView` — calling it
 * throws. That is a gap in the environment, not a case any browser hits, so it
 * is filled here rather than guarded at every call site: a `typeof` check in
 * product code would exist solely to describe a DOM that does not ship.
 *
 * The `typeof` guard is for this file, not for the DOM: setup runs for every
 * suite, including the ones on the `node` environment where `Element` itself
 * does not exist.
 */
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
