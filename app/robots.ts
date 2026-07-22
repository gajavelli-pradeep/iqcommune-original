import type { MetadataRoute } from "next";

/**
 * robots.txt (audit H7). Defence-in-depth alongside the per-page
 * `robots: { index: false }` on the token and admin routes: disallow the API
 * and admin paths outright, and point crawlers at the sitemap.
 */
const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/console", "/globaladmin", "/user"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
