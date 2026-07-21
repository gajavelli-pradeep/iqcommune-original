import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/** Unmount between tests so a leaked DOM never makes the next test pass. */
afterEach(cleanup);
