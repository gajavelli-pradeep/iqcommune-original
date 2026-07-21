import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    /**
     * Co-located component tests (features/**\/X.test.tsx) plus the shared
     * tests/unit folder.
     *
     * `.tsx` is matched explicitly: the previous project's config included only
     * `tests/unit/**\/*.test.ts`, so every component test it might have had
     * would have been silently skipped. It ended up with zero component tests.
     */
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "{app,components,features,lib,services,hooks,utils}/**/*.{test,spec}.{ts,tsx}",
    ],
    /** Green until the first section lands a test; every section adds one. */
    passWithNoTests: true,
  },
});
