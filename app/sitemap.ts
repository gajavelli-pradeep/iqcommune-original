import type { MetadataRoute } from "next";

/**
 * sitemap.xml (audit H7). Only the two indexable public pages. The token-gated
 * pages (/rate, /consent, /submit-photos, /onboarding, /join-admin) and the
 * admin consoles are noindex and are never linked, so they stay out.
 */
const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/practitioners`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
