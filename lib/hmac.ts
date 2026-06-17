import crypto from "crypto";

const PARAM_KEYS = [
  "name",
  "role",
  "org",
  "module",
  "city",
  "ref",
  "email",
] as const;

export type OnboardingParams = Record<(typeof PARAM_KEYS)[number], string>;

function secret(): string {
  const s = process.env.HMAC_SECRET;
  if (!s || s.length < 32)
    throw new Error("HMAC_SECRET missing or too short (min 32 chars)");
  return s;
}

function computeSig(params: OnboardingParams): string {
  const canonical = PARAM_KEYS.map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHmac("sha256", secret()).update(canonical).digest("hex");
}

export function signOnboardingUrl(params: OnboardingParams): string {
  const sig = computeSig(params);
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const qs = new URLSearchParams({ ...params, sig }).toString();
  return `${base}/onboarding?${qs}`;
}

export function verifyOnboardingParams(
  searchParams: URLSearchParams
): OnboardingParams | null {
  try {
    const sig = searchParams.get("sig");
    if (!sig) return null;

    const params = Object.fromEntries(
      PARAM_KEYS.map((k) => [k, searchParams.get(k) ?? ""])
    ) as OnboardingParams;

    const expected = computeSig(params);
    if (sig.length !== expected.length) return null;

    const valid = crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex")
    );
    return valid ? params : null;
  } catch {
    return null;
  }
}
