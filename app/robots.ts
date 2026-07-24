import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/siteUrl";

/**
 * robots.txt (audit H7). Defence-in-depth alongside the per-page
 * `robots: { index: false }` on the token and admin routes: disallow the API
 * and admin paths outright, and point crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/console", "/globaladmin", "/user"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
