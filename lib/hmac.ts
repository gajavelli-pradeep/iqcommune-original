import crypto from "crypto";
import { getBaseUrl } from "@/lib/base-url";

// ── Shared secret ──────────────────────────────────────────────────────────────

function secret(): string {
  const s = process.env.HMAC_SECRET;
  if (!s || s.length < 32)
    throw new Error("HMAC_SECRET missing or too short (min 32 chars)");
  return s;
}

function sign(canonical: string): string {
  return crypto.createHmac("sha256", secret()).update(canonical).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// ── Agreement / Onboarding links ──────────────────────────────────────────────
// v2: `state` added between `city` and `ref`.
// ⚠ Any links signed before this migration are now invalid — regenerate them.

const ONBOARDING_KEYS = [
  "name", "role", "org", "module", "city", "state", "ref", "email",
] as const;

export type OnboardingParams = Record<(typeof ONBOARDING_KEYS)[number], string>;

function canonicalOnboarding(params: OnboardingParams): string {
  return ONBOARDING_KEYS.map((k) => `${k}=${params[k]}`).join("&");
}

export function signOnboardingUrl(params: OnboardingParams, baseUrl?: string): string {
  const sig  = sign(canonicalOnboarding(params));
  const base = baseUrl ?? getBaseUrl();
  const qs   = new URLSearchParams({ ...params, sig }).toString();
  return `${base}/onboarding?${qs}`;
}

export function verifyOnboardingParams(
  searchParams: URLSearchParams
): OnboardingParams | null {
  try {
    const sig = searchParams.get("sig");
    if (!sig) return null;

    const params = Object.fromEntries(
      ONBOARDING_KEYS.map((k) => [k, searchParams.get(k) ?? ""])
    ) as OnboardingParams;

    const expected = sign(canonicalOnboarding(params));
    return timingSafeEqual(sig, expected) ? params : null;
  } catch {
    return null;
  }
}

// ── Photo submission links ─────────────────────────────────────────────────────

const PHOTO_KEYS = [
  "ref", "session", "module", "date", "city", "state", "name", "role",
] as const;

export type PhotoLinkParams = Record<(typeof PHOTO_KEYS)[number], string> & {
  org?: string;
};

function canonicalPhoto(params: PhotoLinkParams): string {
  return PHOTO_KEYS.map((k) => `${k}=${params[k]}`).join("&") + `&org=${params.org ?? ""}`;
}

export function signPhotoUrl(
  params: PhotoLinkParams,
  baseRoute: "/onboarding" | "/submit-photos" = "/submit-photos",
  baseUrl?: string
): string {
  const sig  = sign(canonicalPhoto(params));
  const base = baseUrl ?? getBaseUrl();
  const qs   = new URLSearchParams({
    ...params,
    ...(params.org ? { org: params.org } : {}),
    sig,
  }).toString();
  return `${base}${baseRoute}?${qs}`;
}

export function verifyPhotoLinkParams(
  params: PhotoLinkParams,
  sig: string
): boolean {
  try {
    const expected = sign(canonicalPhoto(params));
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

// ── Application status links ───────────────────────────────────────────────
// Sent in the confirmation email so practitioners can check their pipeline.

export function signStatusUrl(refCode: string, baseUrl?: string): string {
  const sig  = sign(`status:${refCode}`);
  const base = baseUrl ?? getBaseUrl();
  return `${base}/status?ref=${encodeURIComponent(refCode)}&token=${sig}`;
}

export function verifyStatusToken(refCode: string, token: string): boolean {
  try {
    const expected = sign(`status:${refCode}`);
    return timingSafeEqual(token, expected);
  } catch {
    return false;
  }
}

// ── Session-consent links ──────────────────────────────────────────────────
// The confirmation row is the single source of truth, so the link only needs to
// securely identify it: /consent?ref=<confirmation ref_code>&token=<sig>.

export function signConsentUrl(refCode: string, baseUrl?: string): string {
  const sig  = sign(`consent:${refCode}`);
  const base = baseUrl ?? getBaseUrl();
  return `${base}/consent?ref=${encodeURIComponent(refCode)}&token=${sig}`;
}

export function verifyConsentToken(refCode: string, token: string): boolean {
  try {
    const expected = sign(`consent:${refCode}`);
    return timingSafeEqual(token, expected);
  } catch {
    return false;
  }
}
