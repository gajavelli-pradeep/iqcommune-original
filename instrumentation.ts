// Runs once at server startup — validates all required env vars immediately
// so missing config crashes at boot rather than producing cryptic runtime errors.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}
