const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "HMAC_SECRET",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "NEXT_PUBLIC_BASE_URL",
  "ADMIN_EMAIL",
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
}
