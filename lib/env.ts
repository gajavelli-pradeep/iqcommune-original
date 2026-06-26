const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "HMAC_SECRET",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "NEXT_PUBLIC_BASE_URL",
  // ADMIN_EMAIL is intentionally NOT required — it is a dev/bootstrap convenience only.
  // In production grant access via app_metadata.role = 'admin' in Supabase Auth.
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "ENCRYPTION_KEY",
  "SUPABASE_PHOTOS_BUCKET",
  "CRON_SECRET",
] as const;

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
  if ((process.env.HMAC_SECRET?.length ?? 0) < 32) {
    throw new Error("HMAC_SECRET must be at least 32 characters");
  }
  if ((process.env.ENCRYPTION_KEY?.length ?? 0) !== 64) {
    // lib/encrypt.ts requires exactly 64 hex chars (32 bytes for AES-256).
    // Validate the real requirement at boot, not a weaker proxy that 500s on first encrypt.
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  if ((process.env.CRON_SECRET?.length ?? 0) < 16) {
    throw new Error("CRON_SECRET must be at least 16 characters");
  }
}
