/**
 * Runs once when a Next.js server instance starts (audit H4). Fires the env
 * contract at boot so a misconfigured deploy fails fast — before the first
 * request — instead of 500ing per-route. `validateEnv()` throws with every
 * problem at once; the process then refuses to become ready.
 *
 * Node runtime only: the edge runtime has a different env surface and never
 * touches the service-role key path this guards.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
