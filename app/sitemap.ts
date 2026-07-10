import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/base-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/practitioners`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
